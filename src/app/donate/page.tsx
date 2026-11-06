import InformationPage from "../../components/information-page";
import { pageMetadata } from "../../lib/seo";

export const metadata = {
  ...pageMetadata("/donate", "Contributions unavailable — PhotoResizeKaro", "Voluntary contributions are currently unavailable. Use the free editor or explore optional paid passes."),
  robots: { index: false, follow: true },
};

export default function DonatePage() {
  return <InformationPage title="Contributions are currently unavailable." intro="You can continue using the free photo and signature tools.">
    <p><a href="/#editor">Open the free editor</a> or <a href="/pricing">view optional ₹5 / ₹10 passes</a>.</p>
  </InformationPage>;
}
