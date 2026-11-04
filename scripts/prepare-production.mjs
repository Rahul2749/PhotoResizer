import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("out");
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const htmlFiles = (await files(root)).filter((file) => file.endsWith(".html"));
const hashes = new Set();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/i.test(script[1]) && script[2].trim()) hashes.add(`'sha256-${createHash("sha256").update(script[2]).digest("base64")}'`);
  }
}
if (!htmlFiles.length || !hashes.size) throw new Error("Static HTML or hydration scripts are missing.");
const policy = `default-src 'self'; script-src 'self' ${[...hashes].sort().join(" ")}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; worker-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'`;
const headers = {
  "Content-Security-Policy": policy,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};
await mkdir(".generated", { recursive: true });
await writeFile(".generated/security-policy.json", JSON.stringify({ headers, scriptHashes: [...hashes], htmlFiles: htmlFiles.length }, null, 2));
await writeFile(".generated/security-headers.conf", Object.entries(headers).map(([key, value]) => `add_header ${key} "${value}" always;`).join("\n") + "\n");
await writeFile(path.join(root, "_headers"), "/*\n" + Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`).join("\n") + "\n");
// frame-ancestors is an HTTP-only directive; all other rules also protect plain static previews.
const metaPolicy = policy.replace(/; frame-ancestors 'none'$/, "");
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  await writeFile(file, html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="${metaPolicy}">`));
}
console.log(`Prepared ${htmlFiles.length} static pages with ${hashes.size} script hashes; no inline-script wildcard permission.`);
await import("./verify-production.mjs");
