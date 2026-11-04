import type { Metadata } from "next";
import InformationPage from "../../components/information-page";
import { site } from "../../lib/site";
export const metadata: Metadata = { title: "Contact — PhotoResizeKaro", alternates: { canonical: "/contact" }, description: "Get help or report an incorrect photo/signature preset." };
export default function ContactPage() {
  return <InformationPage title="How can we help?" intro="Report a problem, suggest an improvement, or tell us about a changed application requirement."><section><h2>Email the PhotoResizeKaro team</h2><p><a className="contact-email" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p><p>Include your device, browser, the preset/cycle, and what happened. For a preset correction, include the official notice URL and page number.</p><p>Describe the issue without attaching sensitive photographs, signatures or identity documents. We can usually investigate with a synthetic example.</p></section><section><h2>Security and privacy questions</h2><p>Use the same email with “Security” or “Privacy” in the subject. Avoid posting sensitive details publicly. Please include enough information to reproduce the issue without personal files.</p></section></InformationPage>;
}
