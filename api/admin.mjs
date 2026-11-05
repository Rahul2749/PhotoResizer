import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ApiError, hash, randomToken, unseal } from "./security.mjs";

const derive = promisify(scrypt);
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const statuses = ["paid", "pending", "creating", "failed", "cancelled", "expired", "refunded", "disputed"];
export const adminCookie = "prk_admin_session";

export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, parameters);
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password, encoded) {
  const [algorithm, salt, expected] = (encoded || "").split(":");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(expected || "")) return false;
  const actual = await derive(password, salt, 64, parameters);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export class AdminService {
  constructor(store, config) { this.store = store; this.config = config; this.verifications = 0; }

  async seed() {
    await this.store.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(74201850)");
      if (!this.config.adminEnabled) {
        await client.query("DELETE FROM prk_admin_sessions");
        await client.query("UPDATE prk_admin_users SET active=false WHERE active");
        return;
      }
      const user = (await client.query("SELECT * FROM prk_admin_users WHERE username=$1", [this.config.adminUsername])).rows[0];
      const unchanged = user && await passwordMatches(this.config.adminPassword, user.password_hash);
      await client.query("UPDATE prk_admin_users SET active=false WHERE username<>$1 AND active", [this.config.adminUsername]);
      await client.query("DELETE FROM prk_admin_sessions WHERE user_id IN (SELECT id FROM prk_admin_users WHERE NOT active)");
      if (unchanged) {
        await client.query("UPDATE prk_admin_users SET active=true WHERE id=$1", [user.id]);
      } else {
        const encoded = await passwordHash(this.config.adminPassword);
        const id = user?.id || randomUUID();
        await client.query("INSERT INTO prk_admin_users(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(username) DO UPDATE SET password_hash=$3,active=true,updated_at=now()", [id, this.config.adminUsername, encoded]);
        await client.query("DELETE FROM prk_admin_sessions WHERE user_id=$1", [id]);
      }
    });
  }

  async login(input) {
    if (!this.config.adminEnabled) throw new ApiError(503, "Admin access is not configured on this server.");
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["username", "password"].includes(key)) || typeof input.username !== "string" || input.username.length > 64 || typeof input.password !== "string" || input.password.length > 256 || !input.password) throw new ApiError(400, "Enter your admin username and password.");
    if (this.verifications >= 2) throw new ApiError(429, "Login is busy. Please try again shortly.");
    this.verifications++;
    try {
      const user = (await this.store.pool.query("SELECT * FROM prk_admin_users WHERE username=$1 AND active", [this.config.adminUsername])).rows[0];
      const matched = user && await passwordMatches(input.password, user.password_hash);
      if (!matched || input.username !== this.config.adminUsername) throw new ApiError(401, "Incorrect username or password.");
      const token = randomToken();
      await this.store.transaction(async (client) => {
        // Serialize against credential changes: a login using the old hash cannot survive a rotation.
        const current = (await client.query("SELECT password_hash,active FROM prk_admin_users WHERE id=$1 FOR UPDATE", [user.id])).rows[0];
        if (!current?.active || current.password_hash !== user.password_hash) throw new ApiError(401, "Credentials changed. Sign in again.");
        await client.query("DELETE FROM prk_admin_sessions WHERE user_id=$1 AND (expires_at<now() OR last_seen_at<now()-interval '30 minutes')", [user.id]);
        await client.query("INSERT INTO prk_admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')", [hash(token), user.id]);
        await client.query("DELETE FROM prk_admin_sessions WHERE token_hash IN (SELECT token_hash FROM prk_admin_sessions WHERE user_id=$1 ORDER BY created_at DESC OFFSET 5)", [user.id]);
      });
      return { token, username: user.username, csrfToken: this.csrf(token) };
    } finally { this.verifications--; }
  }

  csrf(token) { return createHmac("sha256", this.config.key).update(`admin-csrf:${token}`).digest("hex"); }
  async session(token) {
    if (!this.config.adminEnabled || !/^[A-Za-z0-9_-]{43}$/.test(token || "")) return null;
    const user = (await this.store.pool.query("UPDATE prk_admin_sessions s SET last_seen_at=now() FROM prk_admin_users u WHERE s.token_hash=$1 AND s.user_id=u.id AND u.active AND u.username=$2 AND s.expires_at>now() AND s.last_seen_at>now()-interval '30 minutes' RETURNING u.username", [hash(token), this.config.adminUsername])).rows[0];
    return user ? { username: user.username, csrfToken: this.csrf(token) } : null;
  }
  checkCsrf(token, provided) {
    const expected = this.csrf(token);
    if (typeof provided !== "string" || !/^[a-f0-9]{64}$/.test(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) throw new ApiError(403, "Refresh the admin page and try again.");
  }
  async logout(token) { await this.store.pool.query("DELETE FROM prk_admin_sessions WHERE token_hash=$1", [hash(token)]); }

  async dashboard(query) {
    const days = Number(query.get("days") || 30), page = Number(query.get("page") || 1);
    const mode = query.get("mode") || this.config.mode, status = query.get("status") || "all";
    if (![1, 7, 30, 90, 365].includes(days) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || !["live", "test", "all", "disabled"].includes(mode) || !["all", ...statuses].includes(status)) throw new ApiError(400, "Invalid dashboard filters.");
    const filter = "created_at >= (date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')-make_interval(days=>$1::integer-1) AND ($2='all' OR mode=$2)";
    const [totals, orders, count, usage, trend, presets, sizes, active] = await Promise.all([
      this.store.pool.query(`SELECT count(*)::integer AS orders,count(*) FILTER(WHERE paid_at IS NOT NULL)::integer AS captured_orders,COALESCE(sum(amount_paise) FILTER(WHERE paid_at IS NOT NULL),0)::bigint AS captured_paise,COALESCE(sum(refunded_paise),0)::bigint AS refunded_paise,COALESCE(sum(amount_paise) FILTER(WHERE paid_at IS NOT NULL AND product_id='donation'),0)::bigint AS donations_paise,count(*) FILTER(WHERE status='paid' AND expires_at>now() AND revoked_at IS NULL)::integer AS active_passes FROM prk_orders WHERE ${filter}`, [days, mode]),
      this.store.pool.query(`SELECT id,product_id,mode,amount_paise,status,email_encrypted,payment_id,link_id,created_at,paid_at,expires_at,refunded_paise FROM prk_orders WHERE ${filter} AND ($3='all' OR status=$3) ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $4`, [days, mode, status, (page - 1) * 20]),
      this.store.pool.query(`SELECT count(*)::integer AS count FROM prk_orders WHERE ${filter} AND ($3='all' OR status=$3)`, [days, mode, status]),
      this.store.pool.query("SELECT event,sum(count)::bigint AS count FROM prk_usage_totals WHERE day >= (now() AT TIME ZONE 'UTC')::date-$1::integer+1 GROUP BY event", [days]),
      this.store.pool.query("SELECT day::text,event,sum(count)::bigint AS count FROM prk_usage_totals WHERE day >= (now() AT TIME ZONE 'UTC')::date-$1::integer+1 AND event IN ('visit','page_view','image_processed','crop_completed','download','zip_download','print_download') GROUP BY day,event ORDER BY day", [days]),
      this.store.pool.query("SELECT preset,sum(count)::bigint AS count FROM prk_usage_totals WHERE day >= (now() AT TIME ZONE 'UTC')::date-$1::integer+1 AND event='image_processed' GROUP BY preset ORDER BY count DESC LIMIT 10", [days]),
      this.store.pool.query("SELECT size_bucket,dimension_bucket,sum(count)::bigint AS count FROM prk_usage_totals WHERE day >= (now() AT TIME ZONE 'UTC')::date-$1::integer+1 AND event='image_processed' GROUP BY size_bucket,dimension_bucket ORDER BY count DESC", [days]),
      this.store.pool.query("SELECT count(*)::integer AS count FROM prk_usage_visits WHERE last_seen_at>now()-interval '5 minutes'")
    ]);
    const summary = Object.fromEntries(Object.entries(totals.rows[0]).map(([key, value]) => [key, Number(value)]));
    return {
      days, page, mode, status, pageSize: 20, totalOrders: count.rows[0].count,
      payments: { ...summary, afterRefundsPaise: summary.captured_paise - summary.refunded_paise },
      usage: { enabled: this.config.usageEnabled, activeNow: active.rows[0].count, totals: Object.fromEntries(usage.rows.map((row) => [row.event, Number(row.count)])), trend: trend.rows.map((row) => ({ ...row, count: Number(row.count) })), presets: presets.rows.map((row) => ({ ...row, count: Number(row.count) })), sizes: sizes.rows.map((row) => ({ ...row, count: Number(row.count) })) },
      orders: orders.rows.map(({ email_encrypted, ...order }) => ({ ...order, email: unseal(email_encrypted, this.config.key, "email") }))
    };
  }
}
