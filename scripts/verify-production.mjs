import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
const manifest = JSON.parse(await readFile(".generated/security-policy.json", "utf8"));
const scriptPolicy = manifest.headers["Content-Security-Policy"].split(";").find((entry) => entry.trim().startsWith("script-src "));
assert.ok(scriptPolicy && !scriptPolicy.includes("unsafe-inline") && !scriptPolicy.includes("unsafe-eval"));
for (const [route, file] of [["", "index.html"], ["/trust", "trust.html"], ["/privacy", "privacy.html"], ["/terms", "terms.html"], ["/contact", "contact.html"], ["/pricing","pricing.html"], ["/donate","donate.html"], ["/refunds","refunds.html"]]) {
  const html = await readFile(path.join("out", file), "utf8");
  assert.ok(html.includes(`href="https://photoresizekaro.in${route}"`), `Missing canonical URL for ${file}`);
  assert.ok(html.includes('http-equiv="Content-Security-Policy"'), `Missing static CSP for ${file}`);
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/i.test(script[1]) && script[2].trim()) assert.ok(manifest.scriptHashes.includes(`'sha256-${createHash("sha256").update(script[2]).digest("base64")}'`), `Unapproved inline script in ${file}`);
  }
}
async function noSourceMaps(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) await noSourceMaps(path.join(directory, entry.name));
    else assert.ok(!entry.name.endsWith(".map"), `Unexpected public source map: ${entry.name}`);
  }
}
await noSourceMaps("out");
assert.ok((await readFile("out/sitemap.xml", "utf8")).includes("https://photoresizekaro.in/contact"));
assert.ok((await readFile("out/robots.txt", "utf8")).includes("https://photoresizekaro.in/sitemap.xml"));
await readFile("out/404.html");
const home = await readFile("out/index.html", "utf8");
assert.equal((home.match(/<h1\b/g) || []).length, 1, "Homepage must have one main heading.");
assert.ok(home.includes("How to resize a photo or signature online"), "Missing static help content.");
const structured = home.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
assert.ok(structured, "Missing static structured data.");
const graph = JSON.parse(structured[1])["@graph"];
assert.ok(graph.some((node) => node["@type"] === "WebApplication" && node.isAccessibleForFree === true));
assert.ok(home.includes('content="https://photoresizekaro.in/social-card.png"'), "Missing social preview image.");
const socialImage = await readFile("out/social-card.png");
assert.equal(socialImage.readUInt32BE(16), 1200);
assert.equal(socialImage.readUInt32BE(20), 630);
console.log("Production checks passed: canonical URLs, sitemap, robots, hashed script policy and static 404.");
