import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../api/store.mjs";
import { AdminService } from "../api/admin.mjs";
import { UsageService } from "../api/usage.mjs";
import { createApi } from "../api/server.mjs";
import { readConfig, randomToken, seal, hash } from "../api/security.mjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || decodeURIComponent(new URL(databaseUrl).pathname) !== "/photoresizekaro_test") throw new Error("Use only the dedicated photoresizekaro_test database.");
const config = readConfig({ NODE_ENV: "test", APP_ORIGIN: "http://127.0.0.1:3003", DATABASE_URL: databaseUrl, PAYMENTS_DATABASE_NAME: "photoresizekaro_test", PAYMENTS_ENCRYPTION_KEY: "9".repeat(64), ADMIN_USERNAME: "fixture-owner", ADMIN_PASSWORD: "fixture-password-long-enough" });
const store = new Store(databaseUrl);
let admin, usage;
before(async () => { await store.migrate(); });
beforeEach(async () => {
  await store.pool.query("TRUNCATE prk_admin_sessions,prk_admin_users,prk_usage_visits,prk_usage_events,prk_usage_totals,prk_refunds,prk_payment_events,prk_order_access,prk_orders,prk_sessions CASCADE");
  admin = new AdminService(store, config); usage = new UsageService(store, config);
});
after(async () => { await store.close(); });
const counter = (extra = {}) => ({ eventId: randomUUID(), visitId: randomUUID(), event: "image_processed", tool: "photo", preset: "custom", sizeBucket: "20_50kb", dimensionBucket: "301_1000px", ...extra });

test("one seeded admin, salted hash, no default login, unchanged restart preserves sessions", async () => {
  await admin.seed(); const login = await admin.login({ username: config.adminUsername, password: config.adminPassword });
  const user = (await store.pool.query("SELECT * FROM prk_admin_users")).rows[0]; assert.ok(!user.password_hash.includes(config.adminPassword));
  await admin.seed(); assert.ok(await admin.session(login.token)); assert.equal((await store.pool.query("SELECT count(*) FROM prk_admin_users WHERE active")).rows[0].count, "1");
  await assert.rejects(() => admin.login({ username: "admin", password: "admin" }), /Incorrect/);
  const disabled = new AdminService(store, { ...config, adminEnabled: false }); assert.equal(await disabled.session(login.token), null);
  await assert.rejects(() => disabled.login({ username: "admin", password: "admin" }), /not configured/);
  await disabled.seed();await admin.seed();assert.equal(await admin.session(login.token),null);
});
test("password and username rotations revoke old sessions and leave only one active account", async () => {
  await admin.seed(); const first = await admin.login({ username: config.adminUsername, password: config.adminPassword });
  const changed = new AdminService(store, { ...config, adminPassword: "new-fixture-password-long" }); await changed.seed();
  assert.equal(await changed.session(first.token), null); await assert.rejects(() => changed.login({ username: config.adminUsername, password: config.adminPassword }), /Incorrect/);
  const second = await changed.login({ username: config.adminUsername, password: "new-fixture-password-long" });
  const renamed = new AdminService(store, { ...config, adminUsername: "another-owner" }); await renamed.seed();
  assert.equal(await renamed.session(second.token), null); assert.equal((await store.pool.query("SELECT count(*) FROM prk_admin_users WHERE active")).rows[0].count, "1");
});
test("admin sessions expire on idle and absolute limits, logout deletes the server session", async () => {
  await admin.seed(); const input = { username: config.adminUsername, password: config.adminPassword };
  const idle = await admin.login(input); await store.pool.query("UPDATE prk_admin_sessions SET last_seen_at=now()-interval '31 minutes'"); assert.equal(await admin.session(idle.token), null);
  const expired = await admin.login(input); await store.pool.query("UPDATE prk_admin_sessions SET expires_at=now()-interval '1 second'"); assert.equal(await admin.session(expired.token), null);
  const active = await admin.login(input); await admin.logout(active.token); assert.equal(await admin.session(active.token), null);
});
test("anonymous counters deduplicate concurrent events and count a tab only once per day", async () => {
  const event = counter(); await Promise.all(Array.from({ length: 8 }, () => usage.record(event)));
  await usage.record(counter({ visitId: event.visitId, event: "crop_completed" }));
  const totals = (await store.pool.query("SELECT event,sum(count)::integer AS count FROM prk_usage_totals GROUP BY event")).rows;
  assert.deepEqual(Object.fromEntries(totals.map((row) => [row.event, row.count])), { visit: 1, image_processed: 1, crop_completed: 1 });
  const serialized = JSON.stringify((await store.pool.query("SELECT * FROM prk_usage_visits")).rows); assert.ok(!serialized.includes(event.visitId));
  await assert.rejects(() => usage.record(counter({ filename: "private.jpg" })), /anonymous/);
  await assert.rejects(() => usage.record(counter({ preset: "anything-from-a-filename" })), /Invalid/);
  await assert.rejects(() => usage.record(counter({ eventId:[randomUUID()] })), /Invalid/);
  await assert.rejects(() => usage.record(counter({ event: "page_view", tool: "photo" })), /Invalid page/);
});
test("usage can be disabled and cleanup removes short-lived identifiers while keeping aggregates", async () => {
  const disabled = new UsageService(store, { ...config, usageEnabled: false }); await disabled.record(counter()); assert.equal((await store.pool.query("SELECT count(*) FROM prk_usage_totals")).rows[0].count, "0");
  await assert.rejects(()=>disabled.record(counter({image:"not-accepted-even-when-disabled"})),/anonymous/);
  await usage.record(counter()); await store.pool.query("UPDATE prk_usage_visits SET day=current_date-3; UPDATE prk_usage_events SET created_at=now()-interval '3 days'");
  await usage.cleanup(); assert.equal((await store.pool.query("SELECT count(*) FROM prk_usage_visits")).rows[0].count, "0"); assert.equal((await store.pool.query("SELECT count(*) FROM prk_usage_events")).rows[0].count, "0"); assert.ok(Number((await store.pool.query("SELECT sum(count) AS count FROM prk_usage_totals")).rows[0].count) > 0);
});
async function order(mode, amount, product = "zip-day") {
  const session = await store.createSession(randomToken()), id = randomUUID();
  await store.reserveOrder({ id, sessionId: session.id, idempotencyKey: randomUUID(), requestHash: hash(id), productId: product, mode, amount, email: seal("buyer@example.test", config.key, "email"), recovery: seal("private-fixture-code", config.key, "recovery"), recoveryHash: hash(randomToken()) });
  const payment = { id: `pay_${randomUUID().replaceAll("-", "")}`, amount, currency: "INR", status: "captured", captured: true };
  await store.applyPayment(id, payment, product === "donation" ? 0 : 86400); return { id, payment };
}
test("dashboard separates live and test money, handles refunds and omits restore secrets", async () => {
  const paid = await order("live", 500); await order("test", 1000, "print-day"); await order("live", 500, "donation");
  await store.revokePayment(paid.payment.id, "fixture-refund", "refund.processed", 100, "rfnd_fixture");
  await usage.record(counter());
  const data = await admin.dashboard(new URLSearchParams({ mode: "live", days: "30" }));
  assert.equal(data.payments.captured_paise, 1000); assert.equal(data.payments.refunded_paise, 100); assert.equal(data.payments.afterRefundsPaise, 900); assert.equal(data.payments.donations_paise, 500); assert.equal(data.totalOrders, 2);
  assert.equal(data.orders[0].email, "buyer@example.test"); assert.ok(!JSON.stringify(data).includes("private-fixture-code")); assert.ok(!JSON.stringify(data).includes("recovery_hash")); assert.equal(data.usage.totals.image_processed, 1);
  const filtered = await admin.dashboard(new URLSearchParams({ mode: "live", status: "refunded", days: "30" })); assert.equal(filtered.orders.length, 1);
  await assert.rejects(() => admin.dashboard(new URLSearchParams({ mode: "live' OR true--" })), /Invalid/);
  await assert.rejects(() => admin.dashboard(new URLSearchParams({ days: "999999" })), /Invalid/);
});
test("HTTP admin auth requires origin, secure cookie, CSRF and authenticated requests", async () => {
  const runtime = createApi({ store, gateway: {}, config: { ...config, production: true } }); await runtime.admin.seed();
  await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${runtime.server.address().port}`;
  const login = { username: config.adminUsername, password: config.adminPassword }, post = (path, input, headers = {}) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", Origin: config.origin, ...headers }, body: JSON.stringify(input) });
  try {
    let response = await fetch(base + "/api/admin/dashboard"); assert.equal(response.status, 401); assert.match(response.headers.get("cache-control"), /no-store/);
    response = await post("/api/admin/login", login, { Origin: "https://evil.example" }); assert.equal(response.status, 403);
    response = await post("/api/admin/login", login); assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie"); assert.match(cookie, /__Host-prk_admin_session=/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/); const auth = await response.json();
    const headers = { Cookie: cookie.split(";")[0] };
    response = await fetch(base + "/api/admin/dashboard?mode=live", { headers }); assert.equal(response.status, 200);
    response = await post("/api/admin/logout", {}, headers); assert.equal(response.status, 403);
    response = await post("/api/admin/logout", {}, { ...headers, "X-CSRF-Token": auth.csrfToken }); assert.equal(response.status, 200);
    response = await fetch(base + "/api/admin/dashboard", { headers }); assert.equal(response.status, 401);
    response = await post("/api/usage", counter({ filename: "private.jpg" })); assert.equal(response.status, 400);
    response = await post("/api/usage", counter()); assert.equal(response.status, 200); assert.equal(response.headers.get("set-cookie"), null);
  } finally { await new Promise((resolve) => runtime.server.close(resolve)); }
});
test("HTTP login rate limiting stops repeated password guessing", async () => {
  const runtime = createApi({ store, gateway: {}, config }); await runtime.admin.seed(); await new Promise((resolve) => runtime.server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${runtime.server.address().port}`;
  try {
    for (let i = 0; i < 6; i++) {
      const response = await fetch(base + "/api/admin/login", { method: "POST", headers: { Origin: config.origin, "Content-Type": "application/json" }, body: JSON.stringify({ username: config.adminUsername, password: "wrong" }) }); assert.equal(response.status, i < 5 ? 401 : 429);
    }
  } finally { await new Promise((resolve) => runtime.server.close(resolve)); }
});
