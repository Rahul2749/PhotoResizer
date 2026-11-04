import type { Metadata } from "next";
import TrustContent from "../../components/trust-content";

export const metadata: Metadata = {
  title: "Your photos, your device — PhotoResizeKaro Trust",
  description: "What happens to your photos and signatures, what the website collects, and how to verify local processing.",
  alternates: { canonical: "/trust" },
};

export default function TrustPage() { return <TrustContent/>; }
