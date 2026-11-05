import Icon from "./icon";
import { site } from "../lib/site";
import UsagePreference from "./usage-preference";
export default function InformationPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <><header className="site-header"><a className="brand" href="/"><span className="brand-icon"><Icon name="image" size={23}/></span>{site.name}.</a><a className="back-to-photo" href="/">Open editor</a></header><main className="information-page"><h1>{title}</h1><p className="information-intro">{intro}</p>{children}<p className="information-updated">Updated 5 November 2026 · <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p><nav className="information-links" aria-label="Website information"><a href="/trust">Trust</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/refunds">Refunds</a><a href="/contact">Contact</a></nav><UsagePreference/></main></>;
}
