"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackUsage } from "../lib/usage";
import { publicToolPaths } from "../lib/tool-index";

export default function UsageTracker() {
  const pathname = usePathname(), previous = useRef("");
  useEffect(() => {
    if (![...publicToolPaths, "/tools", "/about", "/guides/photo-upload-rejected", "/", "/pricing", "/trust", "/privacy", "/terms", "/contact", "/refunds"].includes(pathname) || previous.current === pathname) return;
    previous.current = pathname;
    trackUsage("page_view");
  }, [pathname]);
  return null;
}
