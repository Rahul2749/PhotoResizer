import type { MetadataRoute } from "next";
import { site } from "../lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/trust", "/privacy", "/terms", "/contact"].map((path) => ({ url: `${site.origin}${path}`, changeFrequency: "monthly", priority: path ? 0.4 : 1 }));
}
