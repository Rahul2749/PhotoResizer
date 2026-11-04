import { fileChecks } from "../lib/image-core";
import Icon from "./icon";

type Props = {
  file: { bytes: number; width: number; height: number; mime: string };
  requirements: { minBytes: number; maxBytes: number; width: number; height: number; format: string };
  lang: "en" | "hi";
};

export default function FileChecks({ file, requirements, lang }: Props) {
  const checks = fileChecks(file, requirements);
  const names = lang === "en" ? { size: "File size", dimensions: "Dimensions", format: "Format" } : { size: "फ़ाइल साइज़", dimensions: "माप", format: "फ़ॉर्मैट" };
  const valid = Object.values(requirements).filter((value) => typeof value === "number").every(Number.isFinite) && requirements.minBytes >= 0 && requirements.maxBytes >= 1000 && requirements.maxBytes <= 10_000_000 && requirements.minBytes <= requirements.maxBytes && Number.isInteger(requirements.width) && Number.isInteger(requirements.height) && requirements.width > 0 && requirements.width <= 4096 && requirements.height > 0 && requirements.height <= 4096;
  if (!valid) return <p className="field-help">{lang === "en" ? "Enter valid dimensions and size limits to check this file." : "फ़ाइल जाँचने के लिए सही माप और साइज़ सीमा भरें।"}</p>;
  return <ul className="file-checks" aria-label={lang === "en" ? "File requirement checks" : "फ़ाइल के नियमों की जाँच"}>{(["size", "dimensions", "format"] as const).map((key) => <li key={key} data-passed={checks[key]}><span className="check-status"><Icon name={checks[key] ? "check" : "close"} size={14}/>{checks[key] ? (lang === "en" ? "Pass" : "सही") : (lang === "en" ? "Needs change" : "बदलाव करें")}</span><strong>{names[key]}</strong><span>{key === "size" ? `${(file.bytes / 1000).toFixed(2)} KB · ${requirements.minBytes / 1000}–${requirements.maxBytes / 1000} KB` : key === "dimensions" ? `${file.width} × ${file.height} → ${requirements.width} × ${requirements.height} px` : `${file.mime.split("/")[1].toUpperCase()} → ${requirements.format.split("/")[1].toUpperCase()}`}</span></li>)}</ul>;
}
