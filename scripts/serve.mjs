import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { networkInterfaces } from "node:os";

const root = path.resolve("out");
const lan = process.argv.includes("--lan");
const port = Number(process.env.PORT || (lan ? 3002 : 3000));
let securityHeaders;
try { securityHeaders = JSON.parse(await readFile(".generated/security-policy.json", "utf8")).headers; }
catch { throw new Error("Run npm run build before starting the static preview."); }
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, securityHeaders); res.end(); return; }
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    let file = path.resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403, securityHeaders); res.end(); return; }
    if (!path.extname(file)) file += ".html";
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not found");
    res.writeHead(200, { ...securityHeaders, "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": url.pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache" });
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch { res.writeHead(404, { ...securityHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }); res.end(req.method === "HEAD" ? undefined : await readFile(path.join(root, "404.html"))); }
});
server.listen(port, lan ? "0.0.0.0" : "127.0.0.1", () => {
  process.stdout.write(`PhotoResizeKaro local preview: http://127.0.0.1:${port}\n`);
  if (lan) {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses || []) {
        if (address.family === "IPv4" && !address.internal) process.stdout.write(`Phone preview (same Wi-Fi): http://${address.address}:${port}\n`);
      }
    }
  }
});
