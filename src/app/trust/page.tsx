import { pageMetadata } from "../../lib/seo";
import TrustContent from "../../components/trust-content";

export const metadata = pageMetadata("/trust", "Your photos, your device — PhotoResizeKaro Trust", "What happens to your photos and signatures, what the website collects, and how to verify local processing.");

export default function TrustPage() { return <TrustContent/>; }
