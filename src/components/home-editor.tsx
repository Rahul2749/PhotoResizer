"use client";

import { useEffect, useRef, useState } from "react";
import ThemePicker from "./theme-picker";
import Icon from "./icon";
import FormWorkspace from "./form-workspace";
import ToolGuide from "./tool-guide";
import { words } from "../lib/copy";

export default function HomeEditor() {
  const [lang,setLang] = useState<"en"|"hi">("en"), t=words[lang];
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {document.documentElement.lang=lang;},[lang]);
  return <>
    <a className="skip-link" href="#editor">{lang === "en" ? "Skip to the image editor" : "सीधे इमेज एडिटर पर जाएँ"}</a>
    <header className="site-header"><a className="brand" href="/" aria-label="PhotoResizeKaro home"><span className="brand-icon"><Icon name="image" size={23}/></span><span>PhotoResize<span className="brand-karo">Karo</span><span className="brand-dot">.</span></span></a><nav aria-label={lang === "en" ? "Main navigation" : "मुख्य नेविगेशन"}><a href="#editor" className="nav-editor">{t.tool}</a><button className="nav-link" onClick={() => dialogRef.current?.showModal()}>{t.privacy}<Icon name="shield" size={15}/></button><a className="commerce-link" href="/pricing" target="_blank" rel="noopener noreferrer">{lang==="en"?"Passes":"पास"}</a><a className="commerce-link" href="/donate" target="_blank" rel="noopener noreferrer">{lang==="en"?"Donate":"दान"}</a><button className="language" onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label={lang === "en" ? "Switch to Hindi" : "Switch to English"}>{lang === "en" ? "अ / EN" : "EN / अ"}</button></nav></header>
    <main>
      <section className="tool-intro" aria-labelledby="tool-title"><p className="eyebrow"><Icon name="shield" size={14}/>{t.badge}</p><h1 id="tool-title">{lang === "en" ? "Photo & signature resizer" : "फ़ोटो और हस्ताक्षर रीसाइज़ करें"}</h1><p>{lang === "en" ? "Resize and compress images to 20 KB, 50 KB, 100 KB or your own limit. Free, no login, no watermark." : "इमेज को 20 KB, 50 KB, 100 KB या अपनी सीमा में रीसाइज़ और कंप्रेस करें। मुफ़्त, बिना लॉगिन और वॉटरमार्क।"}</p></section>

      <FormWorkspace lang={lang}/>
      <ThemePicker lang={lang}/>


      <section className="trust-grid" aria-label={t.privacy}>{[["shield", t.trust1, t.trust1Body], ["check", t.trust2, t.trust2Body], ["image", t.trust3, t.trust3Body]].map(([icon, title, body]) => <div className="trust-item" key={title}><span><Icon name={icon} size={21}/></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</section>
      <section className="privacy-banner"><div className="privacy-emblem"><Icon name="shield" size={37}/></div><div><h2>{t.trustTitle}</h2><p>{t.trustBody}</p></div><button onClick={() => dialogRef.current?.showModal()}>{t.learn}<Icon name="arrow" size={17}/></button></section>
      <ToolGuide lang={lang}/>
    </main>
    <footer><div><span className="footer-brand">PhotoResizeKaro.</span><p>{t.footer}</p></div><div className="footer-right"><a className="trust-page-link" href="/trust" target="_blank" rel="noopener noreferrer">{t.trustPage}</a><nav className="footer-links" aria-label={lang === "en" ? "Website information" : "वेबसाइट की जानकारी"}><a href="/privacy" target="_blank" rel="noopener noreferrer">{lang === "en" ? "Privacy" : "गोपनीयता"}</a><a href="/terms" target="_blank" rel="noopener noreferrer">{lang === "en" ? "Terms" : "शर्तें"}</a><a href="/contact" target="_blank" rel="noopener noreferrer">{lang === "en" ? "Contact" : "संपर्क"}</a></nav><p>{t.support}</p></div></footer>
    <dialog ref={dialogRef} className="privacy-dialog" onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }} aria-labelledby="privacy-title"><div className="dialog-top"><span className="privacy-emblem"><Icon name="shield" size={28}/></span><button aria-label={t.close} onClick={() => dialogRef.current?.close()}><Icon name="close"/></button></div><h2 id="privacy-title">{t.modalTitle}</h2>{[t.modal1, t.modal2, t.modal3, t.modal4, t.modal5].map((p) => <p key={p}>{p}</p>)}<a className="trust-page-link" href="/trust" target="_blank" rel="noopener noreferrer">{t.trustPage}</a><button className="choose-button" onClick={() => dialogRef.current?.close()}>{t.close}<Icon name="check" size={17}/></button></dialog>
  </>;
}
