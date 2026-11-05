"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackUsage } from "../lib/usage";

export default function UsageTracker() {
  const pathname = usePathname(), previous = useRef("");
  useEffect(() => {
    if (!["/", "/pricing", "/donate", "/trust", "/privacy", "/terms", "/contact", "/refunds"].includes(pathname) || previous.current === pathname) return;
    previous.current = pathname;
    trackUsage("page_view");
  }, [pathname]);
  return null;
}
