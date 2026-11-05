"use client";
import { useEffect, useState } from "react";
import { setUsagePreference, usageAllowed } from "../lib/usage";

export default function UsagePreference() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { const update = () => setAllowed(usageAllowed()); update(); window.addEventListener("prk-usage-preference", update); return () => window.removeEventListener("prk-usage-preference", update); }, []);
  return <div className="usage-preference"><p>Anonymous usage counts help improve the tools. No images or filenames are collected.</p><button className="back-to-photo" type="button" aria-pressed={allowed === true} disabled={allowed === null} onClick={() => setUsagePreference(!allowed)}>Anonymous usage counts: {allowed === null ? "checking…" : allowed ? "on — turn off" : "off — turn on"}</button><a href="/privacy">What is counted?</a></div>;
}
