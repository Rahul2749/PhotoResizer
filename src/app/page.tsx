import HomeEditor from "../components/home-editor";
import { homeStructuredData, pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("", "Photo & Signature Resizer — Free Online | PhotoResizeKaro", "Resize photos and signatures to 20KB, 50KB or 100KB. Crop, compress and download JPG, PNG or WebP for free. Your images stay on your device.");

export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c") }}/><HomeEditor/></>;
}
