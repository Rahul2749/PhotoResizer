"use client";

import { useEffect, useRef, useState } from "react";
import { cropRect, toPixels, fileChecks, type EditSettings, type ImageFormat } from "../lib/image-core";
import { processImage } from "../lib/process-image";
import { words } from "../lib/copy";
import { downloadName, type JobSummary, type FileKind } from "../lib/workflow";
import Icon from "./icon";
import FileChecks from "./file-checks";
import type { PresetRule } from "../lib/presets";
import { inspectImage } from "../lib/inspect-image";

type Source = { file: File; bitmap: ImageBitmap; width: number; height: number; mime: string };
type Result = { blob: Blob; url: string; fits: boolean; width: number; height: number; minBytes: number; maxBytes: number };
const bytes = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} MB` : `${(value / 1000).toFixed(2)} KB`;

const signatureWords = {
 en: { editor:"Let’s get your signature ready", sub:"Crop closely. Keep every stroke readable.", clear:"Clear signature", step1:"YOUR SIGNATURE", drop:"Drop your signature here", choose:"Choose a signature", replace:"Replace signature", waiting:"Choose a signature to get started", download:"Download signature", loading:"Opening your signature…", processing:"Preparing your signature…" },
 hi: { editor:"अपने हस्ताक्षर तैयार करें", sub:"करीब से क्रॉप करें। हर रेखा साफ़ रखें।", clear:"हस्ताक्षर हटाएँ", step1:"आपके हस्ताक्षर", drop:"यहाँ हस्ताक्षर छोड़ें", choose:"हस्ताक्षर चुनें", replace:"हस्ताक्षर बदलें", waiting:"शुरू करने के लिए हस्ताक्षर चुनें", download:"हस्ताक्षर डाउनलोड करें", loading:"हस्ताक्षर खुल रहे हैं…", processing:"हस्ताक्षर तैयार हो रहे हैं…" }
};

export default function ImageEditor({kind,lang,onSummary,presetRule,presetVersion=0}:{kind:FileKind;lang:"en"|"hi";onSummary:(summary:JobSummary)=>void;presetRule?:PresetRule|null;presetVersion?:number}) {
  const base = words[lang];
  const t = kind === "signature" ? {...base, ...signatureWords[lang]} : base;
  const [source, setSource] = useState<Source | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [width, setWidth] = useState("600"), [height, setHeight] = useState(kind === "signature" ? "200" : "600");
  const [unit, setUnit] = useState<"px" | "cm" | "%">("px");
  const [ratioLocked, setRatioLocked] = useState(true);
  const [limit, setLimit] = useState(kind === "signature" ? "20" : "50");
  const [minimum, setMinimum] = useState("0");
  const [dpi, setDpi] = useState(96);
  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [rotation, setRotation] = useState(0), [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0), [y, setY] = useState(0);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const abort = useRef<AbortController | null>(null), revision = useRef(0);
  const resultUrl = useRef<string | null>(null);
  const sideways = rotation % 180 !== 0;
  const sourceW = source ? (sideways ? source.height : source.width) : 600;
  const sourceH = source ? (sideways ? source.width : source.height) : 600;
  const outW = toPixels(Number(width), unit, dpi, sourceW), outH = toPixels(Number(height), unit, dpi, sourceH);

  useEffect(() => () => { source?.bitmap.close(); }, [source]);
  useEffect(() => () => { revision.current++; abort.current?.abort(); if (resultUrl.current) URL.revokeObjectURL(resultUrl.current); }, []);

  function invalidate() {
    revision.current++; abort.current?.abort(); setBusy(false); setLoading(false);
    if (resultUrl.current) { URL.revokeObjectURL(resultUrl.current); resultUrl.current = null; }
    setResult(null); setShowResult(false); setError("");
  }

  useEffect(() => {
    if (!presetVersion) return;
    invalidate();
    if (presetRule) {
      setMinimum(String(presetRule.minKB)); setLimit(String(presetRule.maxKB)); setFormat(presetRule.format); setDpi(presetRule.dpi ?? 96);
      setUnit("px"); setWidth(String(presetRule.width ?? outW)); setHeight(String(presetRule.height ?? outH));
      if (presetRule.width && presetRule.height) setRatioLocked(false);
    }
  // Applying is explicit; a new selection revision updates settings without replacing files.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetVersion]);

  useEffect(() => {
    if (!source || !canvasRef.current || !Number.isFinite(outW) || !Number.isFinite(outH) || outW < 1 || outH < 1 || outW > 4096 || outH > 4096) return;
    const canvas = canvasRef.current;
    const scale = Math.min(680 / outW, 350 / outH, 1);
    canvas.width = Math.max(1, Math.round(outW * scale)); canvas.height = Math.max(1, Math.round(outH * scale));
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = cropRect(sourceW, sourceH, outW, outH, zoom, x, y);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (format === "image/jpeg") { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.save();
    ctx.scale(canvas.width / rect.width, canvas.height / rect.height);
    ctx.translate(-rect.x, -rect.y);
    ctx.translate(sourceW / 2, sourceH / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(source.bitmap, -source.width / 2, -source.height / 2, source.width, source.height);
    ctx.restore();
  }, [source, outW, outH, rotation, zoom, x, y, sourceW, sourceH, format, showResult]);

  async function loadFile(file?: File) {
    if (!file) return;
    invalidate(); const id = revision.current; setLoading(true);
    try {
      if (typeof createImageBitmap !== "function") throw new Error("Use a current Chrome, Edge, Firefox or Safari browser to edit images.");
      const inspected = await inspectImage(file);
      if (id !== revision.current) return;
      const decoded = await createImageBitmap(file);
      let bitmap: ImageBitmap;
      const originalWidth = decoded.width, originalHeight = decoded.height;
      try {
        const scale = Math.min(1, 1600 / Math.max(decoded.width, decoded.height));
        bitmap = await createImageBitmap(decoded, {resizeWidth:Math.max(1,Math.round(decoded.width*scale)),resizeHeight:Math.max(1,Math.round(decoded.height*scale)),resizeQuality:"high"});
      } finally { decoded.close(); }
      if (id !== revision.current) { bitmap.close(); return; }
      const w = Math.min(originalWidth, 600), h = Math.max(1, Math.round(originalHeight / originalWidth * w));
      const scale = Math.min(1, 4096 / h);
      setSource({ file, bitmap, width: originalWidth, height: originalHeight, mime: inspected.mime });
      setWidth(String(presetRule?.width ?? Math.max(1, Math.round(w * scale)))); setHeight(String(presetRule?.height ?? Math.max(1, Math.round(h * scale))));
      setUnit("px"); setRatioLocked(!presetRule?.width); setRotation(0); setZoom(1); setX(0); setY(0);
    } catch (e) { if (id === revision.current) setError(e instanceof Error ? e.message : "Could not open this image. Try another file."); }
    finally { if (id === revision.current) setLoading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function changeDimension(which: "width" | "height", value: string) {
    invalidate();
    if (which === "width") {
      setWidth(value);
      if (ratioLocked && source && value) setHeight(unit === "%" ? value : String(Number((Number(value) * sourceH / sourceW).toFixed(unit === "cm" ? 2 : 0))));
    } else {
      setHeight(value);
      if (ratioLocked && source && value) setWidth(unit === "%" ? value : String(Number((Number(value) * sourceW / sourceH).toFixed(unit === "cm" ? 2 : 0))));
    }
  }

  function changeUnit(next: "px" | "cm" | "%") {
    invalidate();
    const convert = (n: number, dimension: number) => next === "cm" ? (n / dpi * 2.54).toFixed(2) : next === "%" ? (n / dimension * 100).toFixed(1) : String(n);
    setWidth(convert(outW, sourceW)); setHeight(convert(outH, sourceH)); setUnit(next);
  }

  async function run() {
    if (!source) return;
    invalidate(); const id = revision.current; const controller = new AbortController(); abort.current = controller; setBusy(true);
    try {
      const settings: EditSettings = { width: outW, height: outH, format, maxBytes: Math.floor(Number(limit) * 1000), minBytes: Math.floor(Number(minimum) * 1000), dpi, rotation, zoom, x, y };
      const processed = await processImage(source.file, settings, controller.signal);
      if (id !== revision.current) return;
      const decoded = await createImageBitmap(processed.blob);
      const actualW = decoded.width, actualH = decoded.height; decoded.close();
      if (id !== revision.current) return;
      if (actualW !== outW || actualH !== outH || processed.blob.type !== format) throw new Error("The exported image did not match your settings. Try another format.");
      const url = URL.createObjectURL(processed.blob); resultUrl.current = url;
      const checks = fileChecks({bytes:processed.blob.size,width:actualW,height:actualH,mime:processed.blob.type},{...settings,minBytes:settings.minBytes ?? 0});
      setResult({ ...processed, fits:Object.values(checks).every(Boolean), url, width: actualW, height: actualH, minBytes: settings.minBytes ?? 0, maxBytes: settings.maxBytes }); setShowResult(true);
    } catch (e) { if (id === revision.current && !(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Unable to process this photo."); }
    finally { if (id === revision.current) setBusy(false); }
  }

  useEffect(() => {
    onSummary({status:loading||busy?"processing":result?(result.fits?"ready":"adjust"):source?"editing":"empty", result:result?.fits?{url:result.url,width:result.width,height:result.height,bytes:result.blob.size,mime:result.blob.type,minBytes:result.minBytes,maxBytes:result.maxBytes}:null});
  }, [source,result,busy,loading,onSummary]);

  return (
      <section className="editor" id={`${kind}-editor`} aria-labelledby={`${kind}-editor-title`}><div className="editor-heading"><div><h2 id={`${kind}-editor-title`}>{t.editor}</h2><p>{t.sub}</p></div>{source ? <button className="clear-button" onClick={() => { invalidate(); setLoading(false); setSource(null); }}><Icon name="close" size={16}/>{t.clear}</button> : <span className="private-pill"><Icon name="lock" size={13}/>{t.local}</span>}</div>
        <div className="workspace"><div className="photo-panel"><p className="step-label"><span>01</span>{t.step1}</p>
          <input className="sr-only" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" aria-label={t.choose} onChange={(e) => void loadFile(e.target.files?.[0])}/>
          {!source ? <div className={`dropzone ${drag ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void loadFile(e.dataTransfer.files[0]); }}><div className="upload-symbol"><Icon name="image" size={35}/><span>+</span></div><h3>{loading ? t.loading : t.drop}</h3><p>{t.or}</p><button className="choose-button" disabled={loading} onClick={() => fileInput.current?.click()}><Icon name="upload" size={17}/>{t.choose}</button><small>{t.supported}</small><div className="drop-decoration" aria-hidden="true">↗</div></div> : <><div className="preview-toolbar"><span title={source.file.name} className="filename">{source.file.name}</span><div className="preview-tabs"><button aria-pressed={!showResult} onClick={() => setShowResult(false)}>{t.original}</button><button disabled={!result} aria-pressed={showResult} onClick={() => setShowResult(true)}>{t.result}</button></div></div><div className="preview-stage">{showResult && result ? <img src={result.url} alt={t.result} width={result.width} height={result.height}/> : <canvas ref={canvasRef} aria-label={t.preview}/>}<span className="preview-dimensions">{outW || "—"} × {outH || "—"} px</span></div><div className="source-meta"><span>{source.width} × {source.height} px <span className="dot">·</span> {bytes(source.file.size)}</span><button onClick={() => fileInput.current?.click()}>{t.replace}</button></div><details className="original-checker"><summary>{lang === "en" ? "Check original file against my settings" : "मूल फ़ाइल को मेरी सेटिंग से जाँचें"}</summary><p>{lang === "en" ? "Checks the original, unrotated file using the dimensions, format and size limits you selected. A failure here can be corrected by editing." : "मूल, बिना घुमाई फ़ाइल को आपके चुने माप, फ़ॉर्मैट और साइज़ सीमा से जाँचता है। एडिट करके बदलाव कर सकते हैं।"}</p><FileChecks lang={lang} file={{bytes:source.file.size,width:source.width,height:source.height,mime:source.mime}} requirements={{minBytes:Number(minimum)*1000,maxBytes:Number(limit)*1000,width:outW,height:outH,format}}/></details><div className="crop-actions"><button className="rotate-button" onClick={() => { invalidate(); setRotation((rotation + 90) % 360); setWidth(height); setHeight(width); setX(0); setY(0); }}><Icon name="rotate" size={16}/>{t.rotate}</button><label>{t.zoom}<input aria-label={t.zoom} type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => { invalidate(); setZoom(Number(e.target.value)); }}/><span>{zoom.toFixed(1)}×</span></label></div><div className="position-controls"><label>{t.horizontal}<input type="range" min="-1" max="1" step="0.01" value={x} onChange={(e) => { invalidate(); setX(Number(e.target.value)); }}/></label><label>{t.vertical}<input type="range" min="-1" max="1" step="0.01" value={y} onChange={(e) => { invalidate(); setY(Number(e.target.value)); }}/></label></div><p className="crop-note">{t.cropNote}</p></>}
          <p className="local-note"><Icon name="shield" size={15}/>{t.note}</p>
        </div><div className="settings-panel"><p className="step-label"><span>02</span>{t.step2}</p>{presetRule && <div className={`editor-preset-note ${presetRule.dimensionKind === "conflict" ? "preset-conflict" : ""}`}><strong>{lang === "en" ? "Preset guidance" : "प्रीसेट जानकारी"}</strong><p>{presetRule.dimensions[lang]}</p>{(Number(limit) !== presetRule.maxKB || Number(minimum) !== presetRule.minKB || format !== presetRule.format || (presetRule.width && (outW !== presetRule.width || outH !== presetRule.height || dpi !== (presetRule.dpi ?? 96)))) && <p>{lang === "en" ? "You have adjusted these settings. Recheck them against your application." : "आपने सेटिंग बदली है। आवेदन के नियमों से दोबारा जाँचें।"}</p>}</div>}<fieldset disabled={loading || busy}><legend className="sr-only">{t.step2}</legend><label className="field-heading" htmlFor={`${kind}-size-limit`}>{t.size}<span>KB</span></label><div className="size-options">{["20", "50", "100"].map((n) => <button key={n} aria-pressed={limit === n} onClick={() => { invalidate(); setLimit(n); }}>{n}<span> KB</span></button>)}</div><div className="custom-size"><label htmlFor={`${kind}-size-limit`}>{t.custom}</label><input id={`${kind}-size-limit`} type="number" min="1" max="10000" step="1" value={limit} onChange={(e) => { invalidate(); setLimit(e.target.value); }}/><span>KB</span></div><div className="minimum-size"><label htmlFor={`${kind}-minimum`}>{lang === "en" ? "Minimum (optional)" : "न्यूनतम (वैकल्पिक)"}</label><div><input id={`${kind}-minimum`} type="number" min="0" max="10000" step="0.01" value={minimum} onChange={(e) => { invalidate(); setMinimum(e.target.value); }}/><span>KB</span></div></div><p className="field-help">{lang === "en" ? "Use 0 for no minimum. Both limits are inclusive; 1 KB = 1,000 bytes." : "न्यूनतम सीमा न हो तो 0 रखें। दोनों सीमाएँ शामिल हैं; 1 KB = 1,000 बाइट।"}</p><div className="section-rule"/><div className="dimensions-heading"><span>{t.dimensions}</span><select aria-label={t.unit} value={unit} onChange={(e) => changeUnit(e.target.value as typeof unit)}><option value="px">Pixels (px)</option><option value="cm">Centimetres (cm)</option><option value="%">Percentage (%)</option></select></div><div className="dimensions"><label>{t.width}<div><input type="number" min="0.01" step={unit === "px" ? "1" : "0.01"} value={width} onChange={(e) => changeDimension("width", e.target.value)}/><span>{unit}</span></div></label><span className="dimension-times">×</span><label>{t.height}<div><input type="number" min="0.01" step={unit === "px" ? "1" : "0.01"} value={height} onChange={(e) => changeDimension("height", e.target.value)}/><span>{unit}</span></div></label></div><label className="ratio-lock"><input type="checkbox" checked={ratioLocked} onChange={(e) => { invalidate(); setRatioLocked(e.target.checked); if (e.target.checked) { if (unit === "%") setHeight(width); else setHeight(String(Number((Number(width) * sourceH / sourceW).toFixed(unit === "cm" ? 2 : 0)))); } }}/><Icon name="lock" size={13}/>{t.ratio}</label>{unit === "cm" && <p className="field-help">{lang === "en" ? `Centimetres use ${dpi} DPI. Resolution metadata is set for JPG; PNG/WebP use the browser’s 96 DPI export behavior.` : `cm के लिए ${dpi} DPI है। JPG का रिज़ॉल्यूशन सेट होता है; PNG/WebP ब्राउज़र के 96 DPI एक्सपोर्ट का उपयोग करते हैं।`}</p>}{source && (outW > sourceW || outH > sourceH) && <p className="field-help warning-text">{t.upsize}</p>}<div className="section-rule"/><label className="field-heading" htmlFor={`${kind}-format`}>{t.format}</label><select id={`${kind}-format`} className="format-select" value={format} onChange={(e) => { invalidate(); setFormat(e.target.value as ImageFormat); if (e.target.value !== "image/jpeg") setDpi(96); }}><option value="image/jpeg">JPG · {lang === "en" ? "Best for photos & forms" : "फ़ोटो और फ़ॉर्म के लिए"}</option><option value="image/png">PNG · {lang === "en" ? "Keeps transparency" : "पारदर्शिता रखता है"}</option><option value="image/webp">WebP · {lang === "en" ? "Smaller web images" : "छोटी वेब इमेज"}</option></select>{format === "image/png" && <p className="field-help">{t.pngNote}</p>}{format === "image/jpeg" && <label className="dpi-field">{lang === "en" ? "JPEG resolution (DPI)" : "JPEG रिज़ॉल्यूशन (DPI)"}<select aria-label={lang === "en" ? "JPEG resolution (DPI)" : "JPEG रिज़ॉल्यूशन (DPI)"} value={dpi} onChange={(event) => { invalidate(); setDpi(Number(event.target.value)); }}><option value="96">96 DPI</option><option value="200">200 DPI</option><option value="300">300 DPI</option></select><small>{lang === "en" ? "Sets print resolution metadata; does not add detail." : "प्रिंट रिज़ॉल्यूशन की जानकारी सेट करता है; डिटेल नहीं बढ़ाता।"}</small></label>}</fieldset><button className="process-button" disabled={!source || busy || loading} onClick={() => void run()}>{busy ? <span className="spinner"/> : <Icon name="sparkle" size={19}/>}<span>{busy ? t.processing : t.process}</span>{!busy && <Icon name="arrow" size={18}/>}</button><p className="under-button">{source ? t.local : t.waiting}</p></div></div>
        <div aria-live="polite" aria-atomic="true">{error && <div className="error-message" role="alert">{error}</div>}{result && <div className={`result-panel ${result.fits ? "success" : "needs-adjustment"}`}><div className="result-header"><span className="result-icon"><Icon name={result.fits ? "check" : "image"} size={21}/></span><div><h3>{result.fits ? t.save : t.failed}</h3><p>{result.fits ? t.passed : result.blob.size < result.minBytes ? (lang === "en" ? "The image is below your minimum size, even at the highest encoder quality. Try larger dimensions if allowed, another format, or check the required range. No padding bytes were added." : "अधिकतम क्वालिटी पर भी फ़ाइल न्यूनतम साइज़ से छोटी है। अनुमति हो तो बड़े माप, दूसरा फ़ॉर्मैट या सही सीमा चुनें। अतिरिक्त बाइट नहीं जोड़े गए।") : t.failHint}</p></div>{result.fits && <a className="download-button" href={result.url} download={downloadName(kind, result.width, result.height, result.blob.type)}><Icon name="download" size={18}/>{t.download}</a>}</div><div className="result-stats"><div><span>{t.bytes}</span><strong>{bytes(result.blob.size)} <small>/ {bytes(result.minBytes)}–{bytes(result.maxBytes)}</small></strong></div><div><span>{t.pixels}</span><strong>{result.width} × {result.height} px</strong></div><div><span>{t.actualFormat}</span><strong>{result.blob.type.split("/")[1].toUpperCase()}</strong></div>{source && result.blob.size < source.file.size && <div><span>{t.reduction}</span><strong>{Math.round((1 - result.blob.size / source.file.size) * 100)}%</strong></div>}</div><FileChecks lang={lang} file={{bytes:result.blob.size,width:result.width,height:result.height,mime:result.blob.type}} requirements={{minBytes:result.minBytes,maxBytes:result.maxBytes,width:outW,height:outH,format}}/><p className="result-note">{t.report}</p></div>}</div>
      </section>
  );
}
