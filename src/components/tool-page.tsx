import FormWorkspace from "./form-workspace";
import ToolLinks from "./tool-links";
import UsagePreference from "./usage-preference";
import { site } from "../lib/site";
import { toolStructuredData } from "../lib/seo";
import type { ToolPageData } from "../lib/tool-pages";

export default function ToolPage({ tool }: { tool: ToolPageData }) {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolStructuredData(tool)).replace(/</g, "\\u003c") }}/>
    <a className="skip-link" href="#editor">Skip to the image editor</a>
    <header className="site-header"><a className="brand" href="/" aria-label="PhotoResizeKaro home">PhotoResizeKaro.</a><nav className="tool-page-nav" aria-label="Main navigation"><a href="/tools">All tools</a><a href="/trust">Privacy & trust</a><a href="/pricing" target="_blank" rel="noopener noreferrer">₹5 / ₹10 passes</a></nav></header>
    <main className="tool-landing">
      <nav className="tool-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/tools">Tools</a><span aria-hidden="true">/</span><span aria-current="page">{tool.heading}</span></nav>
      <section className="tool-intro"><p className="eyebrow">FREE TOOLS · PHOTOS STAY ON YOUR DEVICE</p><h1>{tool.heading}</h1><p>{tool.intro}</p></section>
      <noscript><p className="payment-mode">Enable JavaScript to use the local editor. The instructions and settings below are available without JavaScript.</p></noscript>
      <FormWorkspace lang="en" initialSetup={tool.setup}/>
      <section className="task-article" aria-labelledby="starting-settings-title"><h2 id="starting-settings-title">Starting settings you can change</h2><dl className="task-settings">{tool.settings.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>These are editable task settings. Your current application instructions decide the required format, dimensions and byte range. A passing technical check does not guarantee acceptance.</p></section>
      <section className="task-article" aria-labelledby="task-how-title"><h2 id="task-how-title">How to use this tool</h2><ol><li>Choose a still JPG, PNG or WebP file in the selected tab.</li><li>Confirm the prefilled settings, then crop or rotate if needed. Change any value that differs from your form.</li><li>Select <strong>Resize & compress</strong>, check the actual result and download the individual image for free.</li></ol>{tool.sections.map((section) => <article key={section.title}><h3>{section.title}</h3><p>{section.body}</p></article>)}</section>
      <section className="task-article" aria-labelledby="task-faq-title"><h2 id="task-faq-title">Questions about this tool</h2><div className="tool-faq">{tool.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
      <ToolLinks current={tool.slug}/>
      <section className="task-article task-trust"><h2>What happens to your image?</h2><p>Selected images are decoded, cropped and encoded on your device. We do not receive the pixels, filename or original EXIF/GPS data. Anonymous usage counters can be turned off below. Core editing and individual downloads need no account; paid ZIP and print-sheet shortcuts are optional.</p><a href="/trust">Read how local processing works →</a></section>
      <footer className="task-footer"><p>PhotoResizeKaro · Operated by MGRRNTECH · <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p><nav aria-label="Website information"><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></nav><UsagePreference/></footer>
    </main>
  </>;
}
