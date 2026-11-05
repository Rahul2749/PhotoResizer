import { createHash, createHmac, timingSafeEqual, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export function verifyHmac(body, signature, secret) {
  if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(body).digest(), Buffer.from(signature, "hex"));
}
export function seal(value, key, purpose) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}
export function unseal(value, key, purpose) {
  const bytes = Buffer.from(value, "base64"), decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(purpose)); decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}
export function validateEmail(value) {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) || /[\r\n\x00-\x1f]/.test(value)) throw new ApiError(400, "Enter a valid email address for this payment.");
  return value.trim().toLowerCase();
}
export function readConfig(env = process.env) {
  const origin = new URL(env.APP_ORIGIN || "https://photoresizekaro.in");
  const production = env.NODE_ENV !== "test" && env.NODE_ENV !== "development";
  if (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password || (production && origin.protocol !== "https:")) throw new Error("APP_ORIGIN must be the site's HTTPS origin.");
  const mode = env.PAYMENTS_MODE || "disabled";
  if (!["disabled", "test", "live"].includes(mode)) throw new Error("Invalid PAYMENTS_MODE.");
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const database = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || decodeURIComponent(database.pathname.slice(1)) !== (env.PAYMENTS_DATABASE_NAME || "photoresizekaro")) throw new Error("Use the separate configured PhotoResizeKaro database.");
  if (!/^[a-f0-9]{64}$/i.test(env.PAYMENTS_ENCRYPTION_KEY || "")) throw new Error("PAYMENTS_ENCRYPTION_KEY must be 32 random bytes encoded as 64 hex characters.");
  if (mode !== "disabled" && (!(env.RAZORPAY_KEY_ID || "").startsWith(`rzp_${mode}_`) || !env.RAZORPAY_KEY_SECRET || (env.RAZORPAY_WEBHOOK_SECRET || "").length < 24)) throw new Error("Configure matching Razorpay API keys and a webhook secret of at least 24 characters.");
  if (mode === "live" && env.PAYMENTS_LIVE_ENABLED !== "true") throw new Error("Enable live payments explicitly after merchant/test validation.");
  return {
    origin: origin.origin, production, mode, databaseUrl: env.DATABASE_URL,
    key: Buffer.from(env.PAYMENTS_ENCRYPTION_KEY, "hex"), keyId: env.RAZORPAY_KEY_ID || "", keySecret: env.RAZORPAY_KEY_SECRET || "",
    webhookSecrets: [env.RAZORPAY_WEBHOOK_SECRET, env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS].filter(Boolean),
    accountId: env.RAZORPAY_ACCOUNT_ID || "", supportEnabled: env.SUPPORT_PAYMENTS_APPROVED === "true",
    trustProxy: env.TRUST_PROXY === "true", port: Number(env.PORT || 3000),
  };
}
