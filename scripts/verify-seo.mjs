import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const origin = "https://photoresizekaro.in";
const sitemap = await readFile("out/sitemap.xml", "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
const titles = new Set(), descriptions = new Set();
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const htmlPath = (pathname) => path.join("out", pathname === "/" ? "index.html" : `${pathname.replace(/^\//, "")}.html`);
assert.equal(new Set(urls.map((url) => url.href)).size, urls.length, "Duplicate sitemap entries.");
for (const url of urls) {
  assert.equal(url.origin, origin);
  assert.ok(!/admin|payment-status|purchases|\/api\//.test(url.pathname), "Private route in sitemap.");
  const html = await readFile(htmlPath(url.pathname), "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `Expected one H1 on ${url.pathname}`);
  assert.ok(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(html), `Indexable route marked noindex: ${url.pathname}`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = [...html.matchAll(/<meta\b[^>]*>/g)].map((match) => match[0]).find((tag) => attr(tag, "name") === "description");
  const value = description && attr(description, "content");
  assert.ok(title && !titles.has(title), `Missing/duplicate title on ${url.pathname}`); titles.add(title);
  assert.ok(value && !descriptions.has(value), `Missing/duplicate description on ${url.pathname}`); descriptions.add(value);
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]).find((tag) => attr(tag, "rel") === "canonical");
  assert.equal(new URL(attr(canonical || "", "href")).href, url.href, `Canonical mismatch on ${url.pathname}`);
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const target = new URL(match[1].replaceAll("&amp;", "&"), url);
    if (target.origin !== origin) continue;
    await stat(htmlPath(target.pathname));
  }
}
const tools = ["resize-image-to-20kb", "resize-image-to-50kb", "resize-image-to-100kb", "resize-image-to-200kb", "signature-resizer", "resize-image-to-200x230", "passport-photo-resizer"];
for (const slug of tools) {
  assert.ok(urls.some((url) => url.pathname === `/${slug}`), `Tool missing from sitemap: ${slug}`);
  const html = await readFile(htmlPath(`/${slug}`), "utf8");
  const schema = JSON.parse(html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.ok(schema["@graph"].some((node) => node["@type"] === "BreadcrumbList" && node.itemListElement.length === 3));
  assert.ok(schema["@graph"].some((node) => node["@type"] === "WebApplication" && node.offers.price === 0));
  assert.ok(html.includes('id="editor"'), `Tool must work on its own page: ${slug}`);
}
console.log(`SEO export checks passed: ${urls.length} canonical public pages, unique metadata, static headings, working internal links and tool schema.`);
