"use client";

import { useEffect, useRef, useState } from "react";
import ThemePicker from "../components/theme-picker";
import Icon from "../components/icon";
import FormWorkspace from "../components/form-workspace";
import { words } from "../lib/copy";

export default function Home() {
  const [lang,setLang] = useState<"en"|"hi">("en"), t=words[lang];
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {document.documentElement.lang=lang;},[lang]);
  return <>
    <header className="site-header"><a className="brand" href="#" aria-label="PhotoResizeKaro home"><span className="brand-icon"><Icon name="image" size={23}/></span><span>PhotoResize<span className="brand-karo">Karo</span><span className="brand-dot">.</span></span></a><nav><a href="#editor" className="nav-editor">{t.tool}</a><button className="nav-link" onClick={() => dialogRef.current?.showModal()}>{t.privacy}<Icon name="shield" size={15}/></button><button className="language" onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label={lang === "en" ? "Switch to Hindi" : "Switch to English"}>{lang === "en" ? "अ / EN" : "EN / अ"}</button></nav></header>
    <main>
      <ThemePicker lang={lang}/>
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><span/>{t.badge}</p><h1>{t.heading}<br/><span>{t.heading2}</span></h1><p className="hero-intro">{t.intro}</p><div className="hero-checks"><span><Icon name="check" size={15}/>{t.noLogin}</span><span><Icon name="check" size={15}/>{t.noWatermark}</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-grid"/><div className="photo-stack back"/><div className="photo-stack front"><div className="portrait"><div className="portrait-head"/><div className="portrait-body"/><div className="crop-corner tl"/><div className="crop-corner tr"/><div className="crop-corner bl"/><div className="crop-corner br"/></div><div className="photo-caption"><span>PHOTO.JPG</span><b>50 KB <Icon name="check" size={12}/></b></div></div><div className="art-badge"><Icon name="shield" size={19}/>{t.local}</div><div className="art-spark"><Icon name="sparkle" size={30}/></div></div></section>

      <FormWorkspace lang={lang}/>


      <section className="trust-grid" aria-label={t.privacy}>{[["shield", t.trust1, t.trust1Body], ["check", t.trust2, t.trust2Body], ["image", t.trust3, t.trust3Body]].map(([icon, title, body]) => <div className="trust-item" key={title}><span><Icon name={icon} size={21}/></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</section>
      <section className="privacy-banner"><div className="privacy-emblem"><Icon name="shield" size={37}/></div><div><h2>{t.trustTitle}</h2><p>{t.trustBody}</p></div><button onClick={() => dialogRef.current?.showModal()}>{t.learn}<Icon name="arrow" size={17}/></button></section>
    </main>
    <footer><div><span className="footer-brand">PhotoResizeKaro.</span><p>{t.footer}</p></div><div className="footer-right"><a className="trust-page-link" href="/trust" target="_blank" rel="noopener noreferrer">{t.trustPage}</a><nav className="footer-links" aria-label={lang === "en" ? "Website information" : "वेबसाइट की जानकारी"}><a href="/privacy" target="_blank" rel="noopener noreferrer">{lang === "en" ? "Privacy" : "गोपनीयता"}</a><a href="/terms" target="_blank" rel="noopener noreferrer">{lang === "en" ? "Terms" : "शर्तें"}</a><a href="/contact" target="_blank" rel="noopener noreferrer">{lang === "en" ? "Contact" : "संपर्क"}</a></nav><p>{t.support}</p></div></footer>
    <dialog ref={dialogRef} className="privacy-dialog" onClick={(e) => { if (e.target === e.currentTarget) dialogRef.current?.close(); }} aria-labelledby="privacy-title"><div className="dialog-top"><span className="privacy-emblem"><Icon name="shield" size={28}/></span><button aria-label={t.close} onClick={() => dialogRef.current?.close()}><Icon name="close"/></button></div><h2 id="privacy-title">{t.modalTitle}</h2>{[t.modal1, t.modal2, t.modal3, t.modal4, t.modal5].map((p) => <p key={p}>{p}</p>)}<a className="trust-page-link" href="/trust" target="_blank" rel="noopener noreferrer">{t.trustPage}</a><button className="choose-button" onClick={() => dialogRef.current?.close()}>{t.close}<Icon name="check" size={17}/></button></dialog>
  </>;
}
