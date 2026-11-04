"use client";

import { useCallback, useRef, useState } from "react";
import ImageEditor from "./image-editor";
import PresetPicker from "./preset-picker";
import type { ExamPreset } from "../lib/presets";
import Icon from "./icon";
import { downloadName, type FileKind, type JobSummary } from "../lib/workflow";

const empty: JobSummary = { status: "empty", result: null };
const copy = {
  en: {
    title: "One form. Two files. All set.", intro: "Prepare your photo and signature separately, then review them together.",
    photo: "Photo", signature: "Signature", review: "Review & download", empty: "Not added", editing: "Needs processing", processing: "Processing…", adjust: "Needs adjustment", ready: "Ready",
    limits: "Starting limits: photo 50 KB, signature 20 KB. These are editable examples, not official exam requirements. Follow your application’s instructions.",
    nextSignature: "Continue to signature", nextReview: "Review both files", startOver: "Clear both files", clearTitle: "Clear this session?", clearBody: "This removes both files and their edits from this page. Original files and downloads on your device remain.", cancel: "Keep editing", confirm: "Clear both files",
    reviewTitle: "Review your files", bothReady: "Both files pass the size, dimension and format checks.", notReady: "Prepare each file to see its final preview and download here.", visual: "Before submitting, check that your face and every signature stroke are clear. File checks do not guarantee application acceptance.", editPhoto: "Edit photo", editSignature: "Edit signature", downloadPhoto: "Download photo", downloadSignature: "Download signature", missing: "No validated result yet", local: "Both files stay on your device. Each download is a separate image.", single: "Only need one file? You can download it directly from its editor.", readyCount: "files ready", signatureTip: "Signature tip: use a clear image on plain paper. Crop away extra margins without cutting off any strokes.",
  },
  hi: {
    title: "एक फ़ॉर्म। दो फ़ाइलें। सब तैयार।", intro: "फ़ोटो और हस्ताक्षर अलग तैयार करें, फिर दोनों की साथ में जाँच करें।",
    photo: "फ़ोटो", signature: "हस्ताक्षर", review: "जाँचें और डाउनलोड करें", empty: "अभी नहीं जोड़ा", editing: "प्रोसेसिंग बाकी", processing: "प्रोसेस हो रहा है…", adjust: "बदलाव ज़रूरी", ready: "तैयार",
    limits: "शुरुआती सीमाएँ: फ़ोटो 50 KB, हस्ताक्षर 20 KB। ये बदलने योग्य उदाहरण हैं, आधिकारिक परीक्षा नियम नहीं। अपने आवेदन के निर्देश मानें।",
    nextSignature: "हस्ताक्षर की ओर बढ़ें", nextReview: "दोनों फ़ाइलें जाँचें", startOver: "दोनों फ़ाइलें हटाएँ", clearTitle: "यह सत्र साफ़ करें?", clearBody: "इस पेज से दोनों फ़ाइलें और उनके बदलाव हटेंगे। डिवाइस की मूल और डाउनलोड की फ़ाइलें बनी रहेंगी।", cancel: "एडिट जारी रखें", confirm: "दोनों फ़ाइलें हटाएँ",
    reviewTitle: "अपनी फ़ाइलें जाँचें", bothReady: "दोनों फ़ाइलों के साइज़, माप और फ़ॉर्मैट की जाँच सफल है।", notReady: "हर फ़ाइल तैयार करने के बाद उसका अंतिम प्रीव्यू और डाउनलोड यहाँ दिखेगा।", visual: "जमा करने से पहले चेहरा और हस्ताक्षर की हर रेखा साफ़ होने की जाँच करें। फ़ाइल की जाँच आवेदन स्वीकार होने की गारंटी नहीं है।", editPhoto: "फ़ोटो एडिट करें", editSignature: "हस्ताक्षर एडिट करें", downloadPhoto: "फ़ोटो डाउनलोड करें", downloadSignature: "हस्ताक्षर डाउनलोड करें", missing: "अभी जाँचा हुआ परिणाम नहीं", local: "दोनों फ़ाइलें आपके डिवाइस पर रहती हैं। हर डाउनलोड एक अलग इमेज है।", single: "केवल एक फ़ाइल चाहिए? उसके एडिटर से सीधे डाउनलोड करें।", readyCount: "फ़ाइलें तैयार", signatureTip: "हस्ताक्षर सुझाव: सादे कागज़ पर साफ़ इमेज लें। बिना कोई रेखा काटे अतिरिक्त किनारे क्रॉप करें।",
  },
};

export default function FormWorkspace({ lang }: { lang: "en" | "hi" }) {
  const t = copy[lang];
  const [active, setActive] = useState<FileKind | "review">("photo");
  const [photo, setPhoto] = useState<JobSummary>(empty), [signature, setSignature] = useState<JobSummary>(empty);
  const [preset, setPreset] = useState<ExamPreset|null>(null);
  const [presetVersion,setPresetVersion] = useState(0);
  const includePhoto = !preset || preset.photo !== null;
  const requiredCount = includePhoto ? 2 : 1;
  const [session, setSession] = useState(0);
  const clearDialog = useRef<HTMLDialogElement>(null);
  const onPhoto = useCallback((job: JobSummary) => setPhoto(job), []);
  const onSignature = useCallback((job: JobSummary) => setSignature(job), []);
  const readyCount = Number(includePhoto && photo.status === "ready") + Number(signature.status === "ready");
  const steps = ["photo", "signature", "review"] as const;
  const statuses = { photo: includePhoto ? t[photo.status] : (lang === "en" ? "Capture on portal" : "पोर्टल पर फ़ोटो लें"), signature: t[signature.status], review: `${readyCount}/${requiredCount} ${t.readyCount}` };

  function navigate(step: typeof active, focus = false) {
    setActive(step);
    if (focus) document.getElementById(`workflow-tab-${step}`)?.focus();
  }

  return <section id="editor" className="form-workflow" aria-labelledby="workflow-title">
    <div className="workflow-intro"><h2 id="workflow-title">{lang === "en" ? "Choose a file to get started" : "शुरू करने के लिए फ़ाइल चुनें"}</h2><button className="clear-session" onClick={() => clearDialog.current?.showModal()}><Icon name="close" size={15}/>{t.startOver}</button></div>
    <div className="workflow-tabs" role="tablist" aria-label={lang === "en" ? "Application files" : "आवेदन की फ़ाइलें"}>
      {steps.map((step, index) => <button type="button" role="tab" id={`workflow-tab-${step}`} aria-controls={`workflow-panel-${step}`} aria-selected={active === step} tabIndex={active === step ? 0 : -1} key={step} onClick={() => navigate(step)} onKeyDown={(event) => {
        let target = index;
        if (event.key === "ArrowRight") target = (index + 1) % steps.length;
        else if (event.key === "ArrowLeft") target = (index + steps.length - 1) % steps.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = steps.length - 1;
        else return;
        event.preventDefault(); navigate(steps[target], true);
      }}><span className={`workflow-number ${step !== "review" && (step !== "photo" || includePhoto) && (step === "photo" ? photo : signature).status === "ready" ? "is-ready" : ""}`}>{step !== "review" && (step !== "photo" || includePhoto) && (step === "photo" ? photo : signature).status === "ready" ? <Icon name="check" size={15}/> : `0${index + 1}`}</span><span><strong>{t[step]}</strong><small>{statuses[step]}</small></span></button>)}
    </div>
    <details className="preset-disclosure"><summary>{preset ? `${lang === "en" ? "Exam preset" : "परीक्षा प्रीसेट"}: ${preset.name}` : (lang === "en" ? "Exam presets (optional)" : "परीक्षा प्रीसेट (वैकल्पिक)")}</summary><PresetPicker lang={lang} applied={preset} onApply={(next) => { setPreset(next); setPresetVersion((value) => value + 1); if (next?.photo === null) setActive("signature"); }}/></details>
    <p className="workflow-limits">{preset ? (lang === "en" ? "Review the applied rules in Exam presets. Follow the current official instructions; settings below are editable." : "परीक्षा प्रीसेट में लागू नियम देखें। मौजूदा आधिकारिक निर्देश मानें; नीचे की सेटिंग बदल सकती है।") : (lang === "en" ? "Example limits: photo 50 KB · signature 20 KB. Change these to match your form." : "उदाहरण सीमाएँ: फ़ोटो 50 KB · हस्ताक्षर 20 KB। इन्हें अपने फ़ॉर्म के अनुसार बदलें।")}</p>
    <div role="tabpanel" id="workflow-panel-photo" aria-labelledby="workflow-tab-photo" hidden={active !== "photo"}>
      <div hidden={!includePhoto}><ImageEditor key={`photo-${session}`} kind="photo" lang={lang} onSummary={onPhoto} presetRule={preset?.photo} presetVersion={presetVersion}/></div>{!includePhoto && <div className="live-capture-panel"><Icon name="image" size={36}/><h2>{lang === "en" ? "Take your photo on the official portal" : "आधिकारिक पोर्टल पर फ़ोटो लें"}</h2><p>{preset?.note[lang]}</p><a href={preset?.source} target="_blank" rel="noopener noreferrer">{lang === "en" ? "Read the official instructions" : "आधिकारिक निर्देश पढ़ें"} ↗</a></div>}
      <div className="workflow-next"><p>{t.single}</p><button className="choose-button" onClick={() => navigate("signature", true)}>{t.nextSignature}<Icon name="arrow" size={17}/></button></div>
    </div>
    <div role="tabpanel" id="workflow-panel-signature" aria-labelledby="workflow-tab-signature" hidden={active !== "signature"}>
      <ImageEditor key={`signature-${session}`} kind="signature" lang={lang} onSummary={onSignature} presetRule={preset?.signature} presetVersion={presetVersion}/>
      <p className="signature-tip"><Icon name="image" size={16}/>{t.signatureTip}</p>
      <div className="workflow-next"><button className="back-to-photo" onClick={() => navigate("photo", true)}>{t.editPhoto}</button><button className="choose-button" onClick={() => navigate("review", true)}>{t.nextReview}<Icon name="arrow" size={17}/></button></div>
    </div>
    <section role="tabpanel" id="workflow-panel-review" aria-labelledby="workflow-tab-review" hidden={active !== "review"} className="pair-review">
      <div className="review-heading"><div><h2>{t.reviewTitle}</h2><p>{readyCount === requiredCount ? (includePhoto ? t.bothReady : (lang === "en" ? "The required signature upload passes the file checks. Complete live photo capture separately on the official portal." : "ज़रूरी हस्ताक्षर फ़ाइल की जाँच सफल है। आधिकारिक पोर्टल पर लाइव फ़ोटो अलग लें।")) : t.notReady}</p></div><span className="pair-ready-count" aria-live="polite">{readyCount}/{requiredCount} {t.readyCount}</span></div>
      <div className="review-cards">{((includePhoto ? [["photo",photo],["signature",signature]] : [["signature",signature]]) as [FileKind,JobSummary][]).map(([kind, job]) => <article key={kind} className="review-card" aria-label={t[kind]}><div className="review-card-heading"><h3>{t[kind]}</h3><span>{t[job.status]}</span></div><div className="review-image">{job.result ? <img src={job.result.url} alt={lang === "en" ? `Prepared ${kind}` : `${t[kind]} का परिणाम`} width={job.result.width} height={job.result.height}/> : <div><Icon name="image" size={32}/><p>{t.missing}</p></div>}</div>{job.result && <dl className="review-file-details"><div><dt>{lang === "en" ? "File size" : "फ़ाइल साइज़"}</dt><dd>{(job.result.bytes / 1000).toFixed(2)} KB · {job.result.minBytes / 1000}–{job.result.maxBytes / 1000} KB</dd></div><div><dt>{lang === "en" ? "Dimensions" : "माप"}</dt><dd>{job.result.width} × {job.result.height} px</dd></div><div><dt>{lang === "en" ? "Format" : "फ़ॉर्मैट"}</dt><dd>{job.result.mime.split("/")[1].toUpperCase()}</dd></div></dl>}<div className="review-card-actions"><button className="back-to-photo" onClick={() => navigate(kind, true)}>{kind === "photo" ? t.editPhoto : t.editSignature}</button>{job.result && <a className="download-button" href={job.result.url} download={downloadName(kind, job.result.width, job.result.height, job.result.mime)}><Icon name="download" size={16}/>{kind === "photo" ? t.downloadPhoto : t.downloadSignature}</a>}</div></article>)}</div>
      <p className="review-disclaimer">{t.visual}</p>{preset?.livePhoto !== "none" && preset && <p className="review-disclaimer">{preset.note[lang]} {preset.livePhoto === "also" && (lang === "en" ? "Live photo capture is still required on the application portal." : "आवेदन पोर्टल पर लाइव फ़ोटो लेना भी बाकी है।")}</p>}<p className="pair-local-note"><Icon name="shield" size={15}/>{t.local}</p>
    </section>
    <dialog ref={clearDialog} className="privacy-dialog" aria-labelledby="clear-session-title"><h2 id="clear-session-title">{t.clearTitle}</h2><p>{t.clearBody}</p><div className="clear-dialog-actions"><button className="back-to-photo" onClick={() => clearDialog.current?.close()}>{t.cancel}</button><button className="choose-button" onClick={() => { setPhoto(empty); setSignature(empty); setSession((value) => value + 1); setActive("photo"); clearDialog.current?.close(); document.getElementById("workflow-tab-photo")?.focus(); }}>{t.confirm}</button></div></dialog>
  </section>;
}
