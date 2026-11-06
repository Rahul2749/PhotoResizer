import type { Metadata } from "next";
import "./globals.css";
import "./editor-first.css";
import "./commerce.css";
import "./admin.css";
import "./tool-pages.css";
import { site } from "../lib/site";
import { socialImage } from "../lib/seo";
import UsageTracker from "../components/usage-tracker";

export const metadata: Metadata = {
  metadataBase: new URL(site.origin),
  title: "PhotoResizeKaro — Free, private photo resizer",
  description: "Crop, resize and compress photos to 20KB, 50KB or 100KB in your browser. Free, no login, no watermark. Your images stay on your device.",
  alternates: { canonical: "/" },
  applicationName: site.name,
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "192x192" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: { type: "website", locale: "en_IN", siteName: site.name, url: site.origin, title: "PhotoResizeKaro — Free, private photo resizer", description: "Prepare photos and signatures in your browser. No photo uploads, login or watermarks.", images: [socialImage] },
  twitter: { card: "summary_large_image", title: "PhotoResizeKaro", description: "Free photo and signature tools. Your images stay on your device.", images: [socialImage.url] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<UsageTracker/></body></html>;
}
