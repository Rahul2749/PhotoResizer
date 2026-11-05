import type { Metadata } from "next";
import { site } from "./site";
import seller from "../../shared/seller.json";
import type { ToolPageData } from "./tool-pages";

export const socialImage = { url: "/social-card.png", width: 1200, height: 630, alt: "PhotoResizeKaro — free photo and signature resizer with processing on your device" };

export function pageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title, description, alternates: { canonical: path || "/" },
    openGraph: { type: "website", locale: "en_IN", siteName: site.name, url: `${site.origin}${path}`, title, description, images: [socialImage] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage.url] },
  };
}

// Factual Schema.org data; no invented ratings or promise of a Google rich result.
export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${site.origin}/#website`, url: site.origin, name: site.name, inLanguage: "en", publisher: {"@id":`${site.origin}/#organization`} },
    { "@type": "Organization", "@id": `${site.origin}/#organization`, name: seller.name, alternateName: site.name, url: site.origin, email: seller.email, telephone: seller.phone },
    { "@type": "WebPage", "@id": `${site.origin}/#webpage`, url: site.origin, name: "Photo & Signature Resizer", isPartOf: { "@id": `${site.origin}/#website` }, mainEntity: { "@id": `${site.origin}/#app` }, inLanguage: "en" },
    {
      "@type": "WebApplication", "@id": `${site.origin}/#app`, name: site.name, url: site.origin,
      description: "Free browser photo and signature resizer. Crop, resize and compress JPG, PNG and WebP locally, then download separate checked files.",
      applicationCategory: "MultimediaApplication", operatingSystem: "Android, iOS, Windows, macOS, Linux",
      browserRequirements: "Requires JavaScript and a modern browser with Canvas and createImageBitmap support.",
      isAccessibleForFree: true, inLanguage: ["en", "hi"],
      offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
      featureList: ["Photo and signature resizing", "20 KB, 50 KB, 100 KB and custom limits", "JPG, PNG and WebP output", "Crop and rotate", "Local image processing", "Separate photo and signature downloads"],
    },
  ],
};

export function toolStructuredData(tool: ToolPageData) {
  const url = `${site.origin}/${tool.slug}`;
  return {
    "@context": "https://schema.org", "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.origin },
        { "@type": "ListItem", position: 2, name: "Tools", item: `${site.origin}/tools` },
        { "@type": "ListItem", position: 3, name: tool.heading, item: url }
      ] },
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: tool.heading, description: tool.description, isPartOf: { "@id": `${site.origin}/#website` }, mainEntity: { "@id": `${url}#app` }, inLanguage: "en" },
      { "@type": "WebApplication", "@id": `${url}#app`, name: tool.heading, url, description: tool.description, applicationCategory: "MultimediaApplication", operatingSystem: "Android, iOS, Windows, macOS, Linux", isAccessibleForFree: true, offers: { "@type": "Offer", price: 0, priceCurrency: "INR" }, featureList: [tool.setup.label, "Local image processing", "Editable size, crop and format", "Free individual image download"] }
    ]
  };
}
