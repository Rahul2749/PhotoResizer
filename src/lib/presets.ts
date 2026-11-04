export type LocalText = { en: string; hi: string };
export type PresetRule = {
  minKB: number;
  maxKB: number;
  format: "image/jpeg";
  width?: number;
  height?: number;
  dpi?: number;
  dimensionKind: "unspecified" | "preferred" | "derived" | "conflict";
  dimensions: LocalText;
};
export type ExamPreset = {
  id: string;
  name: string;
  authority: string;
  cycle: string;
  scope: "cycle" | "general";
  checked: string;
  reviewBy: string;
  source: string;
  section: string;
  photo: PresetRule | null;
  signature: PresetRule;
  livePhoto: "also" | "only" | "check" | "none";
  note: LocalText;
};

const uncheckedPixels: LocalText = {
  en: "The cited section gives no fixed pixel dimensions. Your dimensions are retained; check framing against the notice.",
  hi: "दिए गए भाग में निश्चित पिक्सेल माप नहीं हैं। आपके माप बने रहेंगे; नोटिस के अनुसार फ़्रेम जाँचें।",
};
const rule = (minKB: number, maxKB: number): PresetRule => ({ minKB, maxKB, format: "image/jpeg", dimensionKind: "unspecified", dimensions: uncheckedPixels });
const dates = { checked: "2026-10-25", reviewBy: "2026-11-24" };

export const examPresets: readonly ExamPreset[] = [
  {
    id: "jee-main-2026", name: "JEE Main", authority: "NTA", cycle: "2026", scope: "cycle", ...dates,
    source: "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/11/202511021649722475.pdf#page=10",
    section: "Information Bulletin 2026 · application procedure, printed p. 4 (PDF p. 10)",
    photo: rule(10, 200), signature: rule(10, 100), livePhoto: "also",
    note: { en: "Use a recent colour portrait on white with the face clearly visible. This prepares the scanned uploads; the portal also captures a live photo.", hi: "सफ़ेद पृष्ठभूमि पर हाल की रंगीन फ़ोटो में चेहरा साफ़ रखें। ये स्कैन अपलोड के लिए हैं; पोर्टल लाइव फ़ोटो भी लेता है।" },
  },
  {
    id: "neet-ug-2026", name: "NEET UG", authority: "NTA", cycle: "2026", scope: "cycle", ...dates,
    source: "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/20260208939209382.pdf#page=21",
    section: "Information Bulletin 2026 · chapter 3, printed pp. 16–17 (PDF pp. 21–22)",
    photo: rule(10, 200), signature: rule(10, 100), livePhoto: "also",
    note: { en: "Keep the face and ears visible against white. Live capture is an additional portal step. Postcard photos, fingerprints and certificates are separate requirements outside this two-file preset.", hi: "सफ़ेद पृष्ठभूमि पर चेहरा और कान साफ़ रखें। लाइव फ़ोटो पोर्टल का अतिरिक्त चरण है। पोस्टकार्ड फ़ोटो, फिंगरप्रिंट और प्रमाणपत्र इस दो-फ़ाइल प्रीसेट से अलग हैं।" },
  },
  {
    id: "cuet-ug-2026", name: "CUET UG", authority: "NTA", cycle: "2026", scope: "cycle", ...dates,
    source: "https://cdnbbsr.s3waas.gov.in/s3d1a21da7bca4abff8b0b61b87597de73/uploads/2026/01/202601031633478370.pdf#page=10",
    section: "Information Bulletin 2026 · printed p. 9 (PDF p. 10), upload instructions",
    photo: rule(10, 200), signature: rule(10, 50), livePhoto: "also",
    note: { en: "Use a recent colour portrait with clear face framing on white. The scanned photo and live photo are separate application steps.", hi: "सफ़ेद पृष्ठभूमि पर हाल की रंगीन फ़ोटो में चेहरा साफ़ रखें। स्कैन फ़ोटो और लाइव फ़ोटो आवेदन के अलग चरण हैं।" },
  },
  {
    id: "ctet-sept-2026", name: "CTET", authority: "CBSE", cycle: "September 2026", scope: "cycle", ...dates,
    source: "https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2026/05/202605111250310617.pdf#page=3",
    section: "September 2026 bulletin · PDF pp. 3 and 27, scanned-image instructions",
    photo: { ...rule(10, 100), width: 413, height: 531, dpi: 300, dimensionKind: "derived", dimensions: { en: "3.5 × 4.5 cm. App derives 413 × 531 px at 300 DPI; the bulletin specifies cm, not these pixel values or DPI.", hi: "3.5 × 4.5 cm। ऐप ने 300 DPI पर 413 × 531 px निकाले हैं; बुलेटिन में cm हैं, ये पिक्सेल या DPI नहीं।" } },
    signature: { ...rule(3, 30), width: 413, height: 177, dpi: 300, dimensionKind: "derived", dimensions: { en: "3.5 × 1.5 cm. App derives 413 × 177 px at 300 DPI, rounded to whole pixels.", hi: "3.5 × 1.5 cm। ऐप ने 300 DPI पर पूरे पिक्सेल में 413 × 177 px निकाले हैं।" } },
    livePhoto: "none",
    note: { en: "JPEG resolution metadata is set to 300 DPI to match the centimetre conversion. DPI does not add image detail. Check readability and the current portal instructions.", hi: "cm रूपांतरण के लिए JPEG रिज़ॉल्यूशन मेटाडेटा 300 DPI होता है। DPI बढ़ाने से डिटेल नहीं बढ़ती। स्पष्टता और पोर्टल के मौजूदा निर्देश जाँचें।" },
  },
  {
    id: "csir-net-june-2026", name: "CSIR-UGC NET", authority: "NTA / CSIR", cycle: "June 2026", scope: "cycle", ...dates,
    source: "https://cdnbbsr.s3waas.gov.in/s3efdf562ce2fb0ad460fd8e9d33e57f57/uploads/2026/05/202605271224945892.pdf",
    section: "Information Bulletin · chapter 5, printed p. 15, registration and uploads",
    photo: rule(10, 200), signature: rule(10, 50), livePhoto: "check",
    note: { en: "These are Joint CSIR-UGC NET June 2026 rules, not the separate UGC-NET exam. Use your own clear portrait and running-hand signature; check any additional capture steps on the portal.", hi: "ये संयुक्त CSIR-UGC NET जून 2026 के नियम हैं, अलग UGC-NET परीक्षा के नहीं। अपनी साफ़ फ़ोटो और सामान्य हस्ताक्षर इस्तेमाल करें; पोर्टल पर अतिरिक्त फ़ोटो चरण जाँचें।" },
  },
  {
    id: "ibps-2026-guide", name: "IBPS PO / CSA / RRB", authority: "IBPS", cycle: "2026–27 calendar guide", scope: "general", ...dates,
    source: "https://www.ibps.in/wp-content/uploads/IBPS_CALENDAR_2026-27_final.pdf",
    section: "Tentative calendar dated 16 January 2026 · process of registration",
    photo: { ...rule(20, 50), dimensions: { en: "The calendar does not give pixel dimensions. Check your specific PO/CSA/RRB notice; existing dimensions are retained.", hi: "कैलेंडर में पिक्सेल माप नहीं हैं। अपनी PO/CSA/RRB अधिसूचना जाँचें; मौजूदा माप बने रहेंगे।" } },
    signature: { ...rule(10, 20), dimensions: { en: "Calendar size guide only. Specific recruitment notice controls dimensions and scanning instructions.", hi: "केवल कैलेंडर की साइज़ गाइड। माप और स्कैनिंग निर्देश अपनी भर्ती अधिसूचना में जाँचें।" } },
    livePhoto: "also",
    note: { en: "General calendar guidance, not a substitute for a recruitment notice. Do not sign in block capitals. Thumb impression and declaration are additional files.", hi: "यह सामान्य कैलेंडर गाइड है; भर्ती की अधिसूचना भी पढ़ें। बड़े अक्षरों में हस्ताक्षर न करें। अंगूठे का निशान और घोषणा अलग फ़ाइलें हैं।" },
  },
  {
    id: "sbi-general-guide", name: "SBI PO / Junior Associate", authority: "SBI", cycle: "General careers FAQ", scope: "general", ...dates,
    source: "https://sbi.bank.in/web/careers/probationary-officers",
    section: "Official careers FAQ · unable to upload photo and signature; also checked Junior Associate FAQ",
    photo: { ...rule(20, 50), width: 200, height: 230, dimensionKind: "preferred", dimensions: { en: "200 × 230 px is preferred in the general FAQ, not a universal mandatory size. Check the current advertisement.", hi: "सामान्य FAQ में 200 × 230 px पसंदीदा है, हर भर्ती के लिए अनिवार्य नहीं। मौजूदा विज्ञापन जाँचें।" } },
    signature: { ...rule(10, 20), width: 140, height: 60, dimensionKind: "preferred", dimensions: { en: "140 × 60 px is preferred. A very clean signature may be below 10 KB even at full quality; adjust dimensions only if your notice permits.", hi: "140 × 60 px पसंदीदा है। साफ़ हस्ताक्षर पूरी क्वालिटी पर भी 10 KB से छोटे हो सकते हैं; माप तभी बदलें जब नोटिस अनुमति दे।" } },
    livePhoto: "check",
    note: { en: "A general FAQ guide, not a verified current recruitment cycle. Confirm format, scanning resolution and any live-photo requirements in your advertisement. JPG is this tool’s export choice.", hi: "यह सामान्य FAQ गाइड है, किसी मौजूदा भर्ती चक्र का सत्यापन नहीं। विज्ञापन में फ़ॉर्मैट, स्कैनिंग रिज़ॉल्यूशन और लाइव फ़ोटो के नियम जाँचें। JPG इस टूल का एक्सपोर्ट विकल्प है।" },
  },
  {
    id: "ssc-cgl-2026", name: "SSC CGL", authority: "SSC", cycle: "2026 · signature size guide", scope: "cycle", ...dates,
    source: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf#page=18",
    section: "Paragraphs 9.4–9.6 (PDF p. 18); Annexure IV (PDF p. 71)",
    photo: null,
    signature: { ...rule(10, 20), dimensionKind: "conflict", dimensions: { en: "Source conflict: paragraph 9.6 says about 6 × 2 cm; Annexure IV says 4 × 2 cm. No dimensions are applied. Confirm the current portal before setting them.", hi: "स्रोत में अंतर: पैरा 9.6 में लगभग 6 × 2 cm, अनुलग्नक IV में 4 × 2 cm है। माप लागू नहीं होते। मौजूदा पोर्टल से जाँचकर भरें।" } },
    livePhoto: "only",
    note: { en: "SSC captures the photo live on its own portal/app. Do not upload a resized existing photo as a substitute. Only the signature’s JPEG size range is applied here.", hi: "SSC अपने पोर्टल/ऐप पर लाइव फ़ोटो लेता है। उसकी जगह पुरानी रीसाइज़ फ़ोटो न दें। यहाँ केवल हस्ताक्षर की JPEG साइज़ सीमा लागू होती है।" },
  },
];

export function presetIsStale(preset: ExamPreset, today = new Date().toISOString().slice(0, 10)) {
  return today > preset.reviewBy;
}
