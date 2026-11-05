import { mkdir, writeFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

// Explicit sources only: never include .env, credentials, dependencies or build output.
const sources = [
  "package.json", "package-lock.json", "next.config.ts", "next-env.d.ts",
  "tsconfig.json", "postcss.config.mjs", "playwright.config.ts",
  "Dockerfile", "compose.yaml", "compose.payments.yaml", ".dockerignore", ".gitignore", ".gitattributes", ".env.example", ".env.api.example",
  ".github", "deploy", "api", "shared", "src", "public", "scripts", "tests", "README.md",
  "photoresizekaro-phased-plan.md", "docs/deployment-ubuntu.md",
  "docs/production-validation.md", "docs/preset-research.md", "docs/seo-launch.md", "docs/payments-deployment.md", "docs/admin-deployment.md",
];
const date = new Date().toISOString().slice(0, 10);
const name = `photoresizekaro-source-${date}.tar.gz`;
await mkdir("release", { recursive: true });
const result = spawnSync("tar", ["-czf", `release/${name}`, ...sources], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Source packaging failed (${result.status}).`);
const listing = spawnSync("tar", ["-tzf", `release/${name}`], { encoding: "utf8" });
if (listing.error) throw listing.error;
if (listing.status !== 0) throw new Error("Could not verify the source archive.");
const entries = new Set(listing.stdout.trim().split(/\r?\n/));
for (const required of ["Dockerfile", "compose.yaml", "deploy/container/nginx.conf", "deploy/nginx-http.conf", "deploy/nginx-https.conf", "docs/deployment-ubuntu.md"]) {
  if (!entries.has(required)) throw new Error(`Source archive is missing ${required}.`);
}
for (const entry of entries) {
  if (entry.split("/").some((part) => [".git", "node_modules", ".generated", ".aws"].includes(part)) || /(^|\/)\.env($|\.)/.test(entry) && ![".env.example",".env.api.example"].includes(entry)) throw new Error(`Unexpected private/generated file: ${entry}`);
}
const digest = createHash("sha256").update(await readFile(`release/${name}`)).digest("hex");
await writeFile(`release/${name}.sha256`, `${digest}  ${name}\n`);
console.log(`Created release/${name}\nSHA-256: ${digest}`);
