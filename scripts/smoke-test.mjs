import assert from "node:assert/strict";
const base = new URL(process.argv[2] || "http://127.0.0.1:8088");
const request = (path, init = {}) => fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(10000), ...init });
let healthy = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try { const response = await request("/healthz"); if (response.status === 200 && (await response.text()).trim() === "ok") { healthy = true; break; } } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.ok(healthy, "Container health check did not become ready.");
for (const route of ["/", "/trust", "/privacy", "/terms", "/contact", "/robots.txt", "/sitemap.xml", "/icon.svg"]) {
  const response = await request(route);
  assert.equal(response.status, 200, `${route} should return 200`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const csp = response.headers.get("content-security-policy") || "";
  const scripts = csp.split(";").find((item) => item.trim().startsWith("script-src ")) || "";
  assert.ok(scripts.includes("sha256-") && !scripts.includes("unsafe-inline") && !scripts.includes("unsafe-eval"), `Weak script policy on ${route}`);
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.ok(!response.headers.get("set-cookie"));
  assert.ok(!(response.headers.get("cache-control") || "").includes("immutable"));
  if (base.protocol === "https:") assert.ok(response.headers.get("strict-transport-security"));
}
const html = await (await request("/")).text();
const asset = html.match(/src="([^" ]*\/_next\/static\/[^" ]+\.js)"/);
assert.ok(asset, "No bundled JavaScript asset found.");
const staticResponse = await request(asset[1]);
assert.equal(staticResponse.status, 200);
assert.ok((staticResponse.headers.get("cache-control") || "").includes("immutable"));
assert.ok(staticResponse.headers.get("content-security-policy"));
for (const route of ["/not-a-real-route", "/.env", "/_headers", "/_next/static/missing.js"]) {
  const response = await request(route);
  assert.equal(response.status, 404, `${route} must not fall back to the editor`);
  assert.ok(!(response.headers.get("cache-control") || "").includes("immutable"));
}
assert.equal((await request("/", { method: "POST", body: "{}" })).status, 405);
assert.equal((await request("/trust", { method: "HEAD" })).status, 200);
assert.ok((await (await request("/contact")).text()).includes("support@photoresizekaro.in"));
console.log(`Production smoke checks passed at ${base.origin}: routes, health, headers, caching, 404s and read-only HTTP methods.`);
