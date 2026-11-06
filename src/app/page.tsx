import HomeEditor from "../components/home-editor";
import { homeStructuredData, pageMetadata } from "../lib/seo";

export const metadata = pageMetadata("", "Photo & Signature Resizer — Free Online | PhotoResizeKaro", "Quickly resize, crop and compress photos and signatures to 20KB, 50KB or 100KB. Free individual downloads, no watermark or login. Images stay on your device.");

export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c") }}/><HomeEditor/></>;
}
