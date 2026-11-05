import rules from "../../shared/usage.json";

export const usagePreferenceKey = "prk-anonymous-usage-disabled";
const visitKey = "prk-usage-tab";
let config: Promise<boolean> | null = null;
type Details = { tool?: "site" | "photo" | "signature" | "pair"; preset?: string; bytes?: number; width?: number; height?: number };

export function usageAllowed() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(usagePreferenceKey) !== "true" && navigator.doNotTrack !== "1" && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  } catch { return false; }
}
function enabled() {
  config ??= fetch("/api/usage/config", { credentials: "omit", cache: "no-store" }).then(async (response) => response.ok && (await response.json()).enabled === true).catch(() => false);
  return config;
}
export function trackUsage(event: string, details: Details = {}) {
  if (!usageAllowed() || !rules.events.includes(event)) return;
  void (async () => {
    if (!await enabled() || !usageAllowed()) return;
    const day = new Date().toISOString().slice(0, 10);
    let visit: { day: string; id: string };
    try {
      visit = JSON.parse(sessionStorage.getItem(visitKey) || "null");
      if (!visit || visit.day !== day) { visit = { day, id: crypto.randomUUID() }; sessionStorage.setItem(visitKey, JSON.stringify(visit)); }
    } catch { return; }
    const bytes = details.bytes || 0, dimension = Math.max(details.width || 0, details.height || 0);
    const sizeBucket = !bytes ? "none" : bytes <= 20000 ? "under_20kb" : bytes <= 50000 ? "20_50kb" : bytes <= 100000 ? "50_100kb" : bytes <= 200000 ? "100_200kb" : bytes <= 500000 ? "200_500kb" : "over_500kb";
    const dimensionBucket = !dimension ? "none" : dimension <= 300 ? "up_to_300px" : dimension <= 1000 ? "301_1000px" : "over_1000px";
    const body = JSON.stringify({ eventId: crypto.randomUUID(), visitId: visit.id, event, tool: details.tool || "site", preset: rules.presets.includes(details.preset || "") ? details.preset : "custom", sizeBucket, dimensionBucket });
    if (!usageAllowed()) return;
    await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", keepalive: true, body }).catch(() => null);
  })().catch(() => null);
}
export function setUsagePreference(allow: boolean) {
  try { localStorage.setItem(usagePreferenceKey, String(!allow)); if (!allow) sessionStorage.removeItem(visitKey); } catch { /* Restricted browser storage means counters stay off. */ }
  window.dispatchEvent(new Event("prk-usage-preference"));
}
