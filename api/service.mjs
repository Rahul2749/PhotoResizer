import { randomUUID, randomBytes } from "node:crypto";
import products from "../shared/products.json" with { type: "json" };
import seller from "../shared/seller.json" with { type: "json" };
import { ApiError, hash, seal, unseal, validateEmail, verifyHmac } from "./security.mjs";

export const isUuid = (value) => typeof value === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const getPlan = (id) => products.find((item) => item.id === id);
const safeLink = (value) => { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "rzp.io" && !url.port && !url.username && !url.password; } catch { return false; } };

export class PaymentService {
  constructor(store, gateway, config) { this.store = store; this.gateway = gateway; this.config = config; this.reconciling = new Map(); }
  catalog() { return { mode: this.config.mode, enabled: this.config.mode !== "disabled", donationsEnabled: this.config.mode !== "disabled" && this.config.supportEnabled, products, donationMinimumPaise: 500, donationMaximumPaise: 100000 }; }
  view(order) { return { id: order.id, productId: order.product_id, mode: order.mode, amountPaise: order.amount_paise, currency: order.currency, status: order.status, createdAt: order.created_at, paidAt: order.paid_at, expiresAt: order.expires_at, refundedPaise: order.refunded_paise, paymentId: order.payment_id, checkoutUrl: order.status === "pending" ? order.checkout_url : null }; }
  async checkout(session, input, idempotencyKey) {
    if (this.config.mode === "disabled") throw new ApiError(503, "Payments are not enabled yet. The free editor is available.");
    if (!isUuid(idempotencyKey)) throw new ApiError(400, "A valid checkout reference is required.");
    if (!input || Array.isArray(input) || Object.keys(input).some((key) => !["productId","email","amountPaise"].includes(key))) throw new ApiError(400, "Invalid checkout details.");
    const email = validateEmail(input.email), plan = getPlan(input.productId);
    if (!plan && input.productId !== "donation") throw new ApiError(400, "Choose a valid pass.");
    if (plan && input.amountPaise !== undefined) throw new ApiError(400, "Pass prices are set by the server.");
    if (input.productId === "donation" && !this.config.supportEnabled) throw new ApiError(503, "Support payments are not enabled yet.");
    const amount = plan?.amountPaise ?? input.amountPaise;
    if (!Number.isSafeInteger(amount) || amount < 500 || amount > 100000 || (!plan && amount % 100 !== 0)) throw new ApiError(400, "Choose a whole-rupee donation from ₹5 to ₹1,000.");
    const id = randomUUID(), restoreCode = `PRK-${randomBytes(18).toString("base64url")}`;
    let { order, created } = await this.store.reserveOrder({ id, sessionId: session.id, idempotencyKey, requestHash: hash(JSON.stringify({ productId:input.productId,email,amount })), productId: input.productId, mode: this.config.mode, amount, email: seal(email,this.config.key,"email"), recovery: seal(restoreCode,this.config.key,"recovery"), recoveryHash: hash(restoreCode) });
    if (created) {
      try {
        const link = await this.gateway.createLink(order, email);
        if (!/^plink_[a-zA-Z0-9]+$/.test(link.id) || link.reference_id !== order.id || link.amount !== amount || link.currency !== "INR" || !safeLink(link.short_url)) throw new Error("Invalid provider response.");
        await this.store.attachLink(order.id,link);
        order = await this.store.getOrder(order.id);
      } catch {
        await this.store.creationFailed(order.id);
        // A timed-out create may have reached Razorpay. A signed paid event can recover it by reference_id.
        throw new ApiError(502, "Checkout could not be confirmed. Check Your purchases before starting another payment.");
      }
    }
    if (order.status === "creating") throw new ApiError(409, "Checkout is still being created. Check Your purchases shortly.");
    return { ...this.view(order), restoreCode: unseal(order.recovery_encrypted,this.config.key,"recovery") };
  }
  async entitlements(session) {
    if (!session) return { mode: this.config.mode, features: [], expiresAt: null, orders: [] };
    const orders = (await this.store.history(session.id)).filter((order) => order.mode === this.config.mode);
    const active = orders.filter((order) => order.status === "paid" && !order.revoked_at && order.expires_at && new Date(order.expires_at).getTime() > Date.now());
    return { mode: this.config.mode, features: [...new Set(active.flatMap((order) => getPlan(order.product_id)?.features || []))], expiresAt: active.length ? new Date(Math.max(...active.map((order) => new Date(order.expires_at).getTime()))).toISOString() : null, orders: orders.map((order) => this.view(order)) };
  }
  async reconcile(order, candidatePaymentId) {
    if (!order || order.mode !== this.config.mode || this.config.mode === "disabled") return order;
    if (!order.link_id && ['creating','failed'].includes(order.status)) {
      const found=await this.gateway.findLink(order.id);
      if(!found){await this.store.pool.query("UPDATE prk_orders SET updated_at=now() WHERE id=$1",[order.id]);return order;}
      if(found.reference_id!==order.id || found.amount!==order.amount_paise || found.currency!==order.currency || !safeLink(found.short_url) || !/^plink_[A-Za-z0-9]+$/.test(found.id))throw new ApiError(409,"Provider checkout details do not match.");
      await this.store.attachLink(order.id,found);order=await this.store.getOrder(order.id);
    }
    if(!order.link_id)return order;
    if (this.reconciling.has(order.id)) return this.reconciling.get(order.id);
    const task = this.performReconciliation(order,candidatePaymentId).finally(() => this.reconciling.delete(order.id));
    this.reconciling.set(order.id,task); return task;
  }
  async performReconciliation(order, candidatePaymentId) {
    const link = await this.gateway.fetchLink(order.link_id);
    if (link.id !== order.link_id || link.reference_id !== order.id || link.amount !== order.amount_paise || link.currency !== order.currency) throw new ApiError(409, "Provider order details did not match.");
    if (["cancelled","expired"].includes(link.status)) { await this.store.markClosed(order.id,link.status); return this.store.getOrder(order.id); }
    if (link.status !== "paid" || link.amount_paid !== order.amount_paise) return order;
    const listed = (link.payments || []).map((payment) => payment.payment_id || payment.id).filter((id) => typeof id === "string" && id.startsWith("pay_"));
    let paymentId = candidatePaymentId || order.payment_id || listed[0];
    if(!paymentId && typeof link.order_id==='string') { const payments=await this.gateway.orderPayments(link.order_id);paymentId=payments.find((payment)=>payment.order_id===link.order_id && ['captured','refunded'].includes(payment.status) && payment.amount===order.amount_paise && payment.currency===order.currency)?.id; }
    if (!paymentId) throw new ApiError(409, "Payment confirmation is still pending.");
    const payment = await this.gateway.fetchPayment(paymentId);
    const associated = listed.includes(payment.id) || (typeof link.order_id === "string" && link.order_id.startsWith("order_") && payment.order_id === link.order_id);
    const captured=payment.status === "captured" && payment.captured === true;
    const refunded=payment.status === "refunded" && Number.isSafeInteger(payment.amount_refunded) && payment.amount_refunded>0;
    if (!associated || payment.id !== paymentId || payment.amount !== order.amount_paise || payment.currency !== order.currency || (!captured&&!refunded) || !Number.isSafeInteger(payment.amount_refunded ?? 0) || (payment.amount_refunded || 0)>order.amount_paise || (payment.amount_refunded || 0)<0) throw new ApiError(409, "Captured payment details did not match.");
    await this.store.applyPayment(order.id,payment,getPlan(order.product_id)?.durationSeconds || 0);
    return this.store.getOrder(order.id);
  }
  async callback(query) {
    const id = query.get("razorpay_payment_link_reference_id"), linkId = query.get("razorpay_payment_link_id"), paymentId = query.get("razorpay_payment_id"), status = query.get("razorpay_payment_link_status");
    if (!isUuid(id) || !/^plink_[a-zA-Z0-9]+$/.test(linkId || "") || !/^pay_[a-zA-Z0-9]+$/.test(paymentId || "") || status !== "paid" || !verifyHmac(`${linkId}|${id}|${status}|${paymentId}`,query.get("razorpay_signature"),this.config.keySecret)) throw new ApiError(400, "Invalid payment return signature.");
    const order = await this.store.getOrder(id);
    if (!order || order.link_id !== linkId || order.mode !== this.config.mode) throw new ApiError(400, "Payment return does not match an order.");
    await this.reconcile(order,paymentId);
    return id;
  }
  async webhook(raw, signature, eventId) {
    if (!this.config.webhookSecrets.some((secret) => verifyHmac(raw,signature,secret))) throw new ApiError(401, "Invalid webhook signature.");
    let event; try { event = JSON.parse(raw.toString("utf8")); } catch { throw new ApiError(400, "Invalid webhook JSON."); }
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new ApiError(400,"Invalid webhook event.");
    if (this.config.accountId && event.account_id !== this.config.accountId) throw new ApiError(401, "Webhook account does not match.");
    const eventKey = typeof eventId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(eventId) ? `${this.config.mode}:${eventId}` : `${this.config.mode}:sha256:${hash(raw)}`;
    if (await this.store.eventSeen(eventKey)) return;
    const type = event.event;
    if (type === "refund.processed" || type === "payment.dispute.created") {
      const entity = type === "refund.processed" ? event.payload?.refund?.entity : event.payload?.dispute?.entity;
      if (!entity || !/^pay_[a-zA-Z0-9]+$/.test(entity.payment_id || "") || (type === "refund.processed" && (entity.status !== "processed" || !/^rfnd_[a-zA-Z0-9]+$/.test(entity.id || "") || !Number.isSafeInteger(entity.amount) || entity.amount <= 0))) throw new ApiError(400, "Invalid payment adjustment.");
      const order = await this.store.byPayment(entity.payment_id);
      if (order && order.mode !== this.config.mode) throw new ApiError(400, "Payment mode does not match.");
      await this.store.revokePayment(entity.payment_id,eventKey,type,type === "refund.processed" ? entity.amount : 0,type === "refund.processed" ? entity.id : null);
      return;
    }
    if (type === "payment_link.paid") {
      const link = event.payload?.payment_link?.entity, payment = event.payload?.payment?.entity;
      if (!link || !isUuid(link.reference_id)) throw new ApiError(400, "Invalid payment-link event.");
      let order = await this.store.getOrder(link.reference_id);
      if (!order || order.mode !== this.config.mode) { await this.store.logEvent(eventKey,type,null,null,"unmatched"); return; }
      // Recover a provider link after an uncertain create response, but verify it with the provider first.
      if (!order.link_id) {
        const verified = await this.gateway.fetchLink(link.id);
        if (verified.reference_id !== order.id || verified.amount !== order.amount_paise || verified.currency !== order.currency || !safeLink(verified.short_url)) throw new ApiError(409, "Provider order details did not match.");
        await this.store.pool.query("UPDATE prk_orders SET link_id=$2,checkout_url=$3,status='pending' WHERE id=$1 AND link_id IS NULL AND status IN ('creating','failed')", [order.id,verified.id,verified.short_url]);
        order = await this.store.getOrder(order.id);
      }
      if (link.id !== order.link_id) throw new ApiError(409, "Payment link does not match.");
      const confirmed = await this.reconcile(order,payment?.id);
      if (!['paid','refunded','disputed'].includes(confirmed.status)) throw new ApiError(503, "Provider payment confirmation is pending.");
      await this.store.logEvent(eventKey,type,order.id,confirmed.payment_id,"verified");
      return;
    }
    await this.store.logEvent(eventKey,typeof type === "string" ? type.slice(0,80) : "unknown",null,null,"ignored");
  }
  async restore(session, code) { if (typeof code !== "string" || !/^PRK-[A-Za-z0-9_-]{24}$/.test(code.trim())) throw new ApiError(400, "Enter the full restore code from your purchase."); return this.store.restore(session.id,hash(code.trim()),this.config.mode); }
  async receipt(session, id) { const order = await this.store.ownedOrder(session.id,id); if (!order) throw new ApiError(404, "Purchase not found in this browser. Use its restore code."); return { ...this.view(order), email: unseal(order.email_encrypted,this.config.key,"email"), restoreCode: unseal(order.recovery_encrypted,this.config.key,"recovery"), seller, note: "Payment acknowledgement, not a GST tax invoice." }; }
}
