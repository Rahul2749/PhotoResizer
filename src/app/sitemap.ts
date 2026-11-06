import type { MetadataRoute } from "next";
import { site } from "../lib/site";
import { publicToolPaths } from "../lib/tool-index";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", ...publicToolPaths, "/tools", "/guides/photo-upload-rejected", "/about", "/trust", "/privacy", "/terms", "/contact", "/pricing", "/refunds"].map((path) => ({ url: `${site.origin}${path}`, ...(["",...publicToolPaths,"/tools","/about","/guides/photo-upload-rejected"].includes(path)?{lastModified:"2026-11-05"}:{}) }));
}
