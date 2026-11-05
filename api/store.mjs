import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ApiError, hash } from "./security.mjs";

export class Store {
  constructor(connectionString) { this.pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 15000 }); this.pool.on("error", () => console.error("payment_database_connection_error")); }
  async migrate() { await this.pool.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8")); }
  async healthy() { await this.pool.query("SELECT id FROM prk_sessions LIMIT 0"); return true; }
  async transaction(work) { const client = await this.pool.connect(); try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } }
  async session(token) { if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null; return (await this.pool.query("SELECT id FROM prk_sessions WHERE token_hash=$1 AND expires_at>now()", [hash(token)])).rows[0] || null; }
  async createSession(token) { const id = randomUUID(); await this.pool.query("INSERT INTO prk_sessions(id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')", [id, hash(token)]); return { id }; }
  async reserveOrder(order) {
    return this.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`checkout:${order.sessionId}`]);
      const existing = (await client.query("SELECT * FROM prk_orders WHERE creator_session=$1 AND idempotency_key=$2", [order.sessionId, order.idempotencyKey])).rows[0];
      if (existing) { if (existing.request_hash !== order.requestHash) throw new ApiError(409, "This checkout reference was used for different details. Start a new checkout."); return { order: existing, created: false }; }
      const count = (await client.query("SELECT count(*)::int AS count FROM prk_orders WHERE (creator_session=$1 AND created_at>now()-interval '1 hour') OR created_at>now()-interval '10 minutes'", [order.sessionId])).rows[0].count;
      if (count >= 100) throw new ApiError(429, "Checkout is busy. Please try again later.");
      const row = (await client.query("INSERT INTO prk_orders(id,creator_session,idempotency_key,request_hash,product_id,mode,amount_paise,currency,email_encrypted,recovery_encrypted,recovery_hash) VALUES($1,$2,$3,$4,$5,$6,$7,'INR',$8,$9,$10) RETURNING *", [order.id,order.sessionId,order.idempotencyKey,order.requestHash,order.productId,order.mode,order.amount,order.email,order.recovery,order.recoveryHash])).rows[0];
      await client.query("INSERT INTO prk_order_access(session_id,order_id) VALUES($1,$2)", [order.sessionId,order.id]);
      return { order: row, created: true };
    });
  }
  async attachLink(id, link) { await this.pool.query("UPDATE prk_orders SET link_id=$2,checkout_url=$3,status='pending',updated_at=now() WHERE id=$1 AND status IN ('creating','failed') AND link_id IS NULL", [id,link.id,link.short_url]); }
  async creationFailed(id) { await this.pool.query("UPDATE prk_orders SET status='failed',updated_at=now() WHERE id=$1 AND status='creating'", [id]); }
  async getOrder(id) { return (await this.pool.query("SELECT * FROM prk_orders WHERE id=$1", [id])).rows[0] || null; }
  async ownedOrder(sessionId, id) { return (await this.pool.query("SELECT o.* FROM prk_orders o JOIN prk_order_access a ON a.order_id=o.id WHERE o.id=$1 AND a.session_id=$2", [id,sessionId])).rows[0] || null; }
  async byPayment(id) { return (await this.pool.query("SELECT * FROM prk_orders WHERE payment_id=$1", [id])).rows[0] || null; }
  async byLink(id) { return (await this.pool.query("SELECT * FROM prk_orders WHERE link_id=$1", [id])).rows[0] || null; }
  async history(sessionId) { return (await this.pool.query("SELECT o.* FROM prk_orders o JOIN prk_order_access a ON a.order_id=o.id WHERE a.session_id=$1 ORDER BY o.created_at DESC LIMIT 50", [sessionId])).rows; }
  async restore(sessionId, recoveryHash, mode) { return this.transaction(async (client) => { const row = (await client.query("SELECT id FROM prk_orders WHERE recovery_hash=$1 AND mode=$2 AND status IN ('paid','refunded','disputed')", [recoveryHash,mode])).rows[0]; if (!row) throw new ApiError(404, "No completed purchase matches that restore code."); await client.query("INSERT INTO prk_order_access(session_id,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [sessionId,row.id]); return row.id; }); }
  async markClosed(id, status) { await this.pool.query("UPDATE prk_orders SET status=$2,updated_at=now() WHERE id=$1 AND status IN ('pending','creating')", [id,status]); }
  async applyPayment(id, payment, duration) {
    return this.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`payment:${payment.id}`]);
      const row = (await client.query("SELECT * FROM prk_orders WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!row) return;
      if ((row.payment_id && row.payment_id !== payment.id) || row.amount_paise !== payment.amount || row.currency !== payment.currency) throw new ApiError(409, "Payment details do not match this order.");
      const refunded = payment.amount_refunded || 0;
      const blocked = (await client.query("SELECT event_type FROM prk_payment_events WHERE payment_id=$1 AND event_type IN ('refund.processed','payment.dispute.created') ORDER BY CASE WHEN event_type='payment.dispute.created' THEN 0 ELSE 1 END LIMIT 1", [payment.id])).rows[0];
      if (blocked) {
        const known=(await client.query("SELECT COALESCE(sum(amount_paise),0)::integer AS amount FROM prk_refunds WHERE payment_id=$1",[payment.id])).rows[0].amount;
        await client.query("UPDATE prk_orders SET payment_id=$2,status=$3,refunded_paise=LEAST(amount_paise,GREATEST(refunded_paise,$4)),revoked_at=COALESCE(revoked_at,now()),updated_at=now() WHERE id=$1", [id,payment.id,blocked.event_type === 'payment.dispute.created' ? 'disputed' : 'refunded',Math.max(refunded,known)]);
        return;
      }
      if (refunded > 0) {
        await client.query("UPDATE prk_orders SET payment_id=$2,status='refunded',refunded_paise=GREATEST(refunded_paise,$3),revoked_at=COALESCE(revoked_at,now()),updated_at=now() WHERE id=$1 AND status<>'disputed'", [id,payment.id,refunded]);
      } else if (!row.revoked_at && !['refunded','disputed'].includes(row.status) && payment.status === 'captured' && payment.captured === true) {
        await client.query("UPDATE prk_orders SET payment_id=$2,status='paid',paid_at=COALESCE(paid_at,now()),expires_at=COALESCE(expires_at,CASE WHEN $3::integer>0 THEN now()+make_interval(secs=>$3) ELSE NULL END),gateway_fee_paise=$4,gateway_tax_paise=$5,updated_at=now() WHERE id=$1", [id,payment.id,duration,Number.isSafeInteger(payment.fee)?payment.fee:null,Number.isSafeInteger(payment.tax)?payment.tax:null]);
      }
    });
  }
  async revokePayment(paymentId, eventId, eventType, amount = 0, refundId = null) {
    return this.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`payment:${paymentId}`]);
      const row = (await client.query("SELECT * FROM prk_orders WHERE payment_id=$1 FOR UPDATE", [paymentId])).rows[0];
      const inserted = await client.query("INSERT INTO prk_payment_events(event_id,event_type,order_id,payment_id,outcome) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING event_id", [eventId,eventType,row?.id || null,paymentId,row?'revoked':'unmatched']);
      if (!inserted.rowCount) return true;
      if (refundId) await client.query("INSERT INTO prk_refunds(refund_id,payment_id,amount_paise) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [refundId,paymentId,amount]);
      if (!row) return true;
      const total=(await client.query("SELECT COALESCE(sum(amount_paise),0)::integer AS amount FROM prk_refunds WHERE payment_id=$1",[paymentId])).rows[0].amount;
      await client.query("UPDATE prk_orders SET status=CASE WHEN status='disputed' OR $2='payment.dispute.created' THEN 'disputed' ELSE 'refunded' END,refunded_paise=LEAST(amount_paise,GREATEST(refunded_paise,$3)),revoked_at=COALESCE(revoked_at,now()),updated_at=now() WHERE id=$1", [row.id,eventType,total]);
      return true;
    });
  }
  async eventSeen(id) { return Boolean((await this.pool.query("SELECT 1 FROM prk_payment_events WHERE event_id=$1", [id])).rowCount); }
  async logEvent(id,type,orderId,paymentId,outcome) { await this.pool.query("INSERT INTO prk_payment_events(event_id,event_type,order_id,payment_id,outcome) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [id,type,orderId,paymentId,outcome]); }
  async reconcileCandidates(mode) { return (await this.pool.query("SELECT * FROM prk_orders WHERE mode=$1 AND ((status IN ('creating','failed','pending') AND created_at>now()-interval '2 days') OR (status='paid' AND (expires_at>now() OR (product_id='donation' AND created_at>now()-interval '30 days')))) ORDER BY updated_at LIMIT 20", [mode])).rows; }
  async close() { await this.pool.end(); }
}
