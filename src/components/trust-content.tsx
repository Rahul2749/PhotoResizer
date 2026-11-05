"use client";

import { useEffect, useState } from "react";
import Icon from "./icon";

const copy = {
  en: {
    back: "Back to the editor", title: "Your photos belong on your device.", intro: "Here is what this version of PhotoResizeKaro does with your files, and how you can check it yourself.",
    badge: "LOCAL PROCESSING · NO ACCOUNT REQUIRED", updated: "Product privacy notes · 5 November 2026",
    cards: [
      ["What happens to my images?", "Your photo and signature are decoded, edited and re-encoded inside your browser. This version has no image upload endpoint. We do not send your images, filenames, thumbnails or extracted photo metadata to a server."],
      ["What is saved?", "Images and generated previews stay in the current page’s memory. This editor does not save them to an account, browser database or cloud history. Reloading or closing the page ends the session. Files you download are saved by your browser on your device."],
      ["What does Clear both files do?", "It cancels processing, releases the current jobs and revokes their preview URLs. It does not securely erase device memory, delete your original files or remove downloads. On a shared phone or computer, remove downloaded files yourself."],
      ["Does the site collect anything else?", "Your browser requests the application’s code and assets from the host. A hosting provider can see request details such as your IP address and may keep security/request logs. This editor has no analytics, advertising, session replay or remote-font scripts. This page does not claim that no data at all is collected."],
      ["What happens to location metadata?", "Exports are re-encoded from image pixels rather than copying the source’s EXIF/GPS metadata. Output resolution information can still be present. Your original file is unchanged. Metadata cleanup is not a way to hide information visibly printed inside an image."],
      ["What do the checks guarantee?", "We check actual exported bytes, pixel dimensions and format against your selected settings. We do not verify identity, face suitability, signature ownership or acceptance by an application portal. A minimum size is checked without inserting padding bytes. Review the image and follow the official application instructions."],
      ["What are the current limits?", "Still JPG, PNG and WebP inputs only. HEIC, PDF and animation editing are not supported. JPEG export supports 96, 200 and 300 DPI; PNG/WebP use browser export behavior. This is an early version; a successful phone test or an automated test is not an independent security audit or an absolute safety guarantee."],
      ["What about paid features?", "Core editing and individual downloads are free. Optional ZIP and print-sheet passes use separate Razorpay-hosted checkout. Checkout requires an email and creates an essential payment-session cookie; orders, payment events and pass access are stored in PostgreSQL. Photos, filenames and image metadata are never included in payment requests. Keep your restore code private. No payment SDK runs in the editor."],
    ],
    verifyTitle: "Try the offline check", steps: ["Load the editor, choose a photo or signature, and make one export.", "Leave the page open and disable networking on that device. Avoid reloading the page.", "Change a size or crop setting, export again, and open the downloaded image.", "Reconnect when you need to load the site again. Installable offline access is not included yet."],
    devTitle: "For a closer look", dev: "On a desktop, open browser developer tools → Network, clear the request list, then select, edit and download an image. This editor should make no photo-upload requests. Application asset requests can appear. Network inspection helps verify behavior in that session; it is not a permanent guarantee about every future release.",
    caution: "Keep original files somewhere safe. Closing this page loses the current edits; it does not remove files already downloaded to your device.",
  },
  hi: {
    back: "एडिटर पर वापस जाएँ", title: "आपकी फ़ोटो आपके डिवाइस पर रहे।", intro: "PhotoResizeKaro के इस संस्करण में आपकी फ़ाइलों के साथ क्या होता है और आप खुद कैसे जाँच सकते हैं।",
    badge: "लोकल प्रोसेसिंग · खाते की ज़रूरत नहीं", updated: "उत्पाद की गोपनीयता जानकारी · 5 नवंबर 2026",
    cards: [
      ["मेरी फ़ोटो के साथ क्या होता है?", "फ़ोटो और हस्ताक्षर आपके ब्राउज़र में खुलते, एडिट और एक्सपोर्ट होते हैं। इस संस्करण में इमेज अपलोड API नहीं है। फ़ोटो, फ़ाइल का नाम, थंबनेल या निकाला हुआ मेटाडेटा सर्वर पर नहीं भेजा जाता।"],
      ["क्या सेव होता है?", "इमेज और प्रीव्यू मौजूदा पेज की मेमोरी में रहते हैं। उन्हें खाते, ब्राउज़र डेटाबेस या क्लाउड हिस्ट्री में सेव नहीं किया जाता। पेज बंद या रीलोड करने से सत्र खत्म होता है। डाउनलोड की गई फ़ाइलें ब्राउज़र आपके डिवाइस पर सेव करता है।"],
      ["दोनों फ़ाइलें हटाने पर क्या होता है?", "प्रोसेसिंग रुकती है, मौजूदा काम के संदर्भ हटते हैं और प्रीव्यू लिंक रद्द होते हैं। डिवाइस मेमोरी सुरक्षित रूप से नहीं मिटती और मूल या डाउनलोड की गई फ़ाइलें नहीं हटतीं। साझा डिवाइस पर डाउनलोड खुद हटाएँ।"],
      ["क्या वेबसाइट कोई अन्य डेटा लेती है?", "ब्राउज़र होस्ट से ऐप की फ़ाइलें माँगता है। होस्ट IP पते जैसी अनुरोध जानकारी देख सकता है और सुरक्षा लॉग रख सकता है। इस एडिटर में एनालिटिक्स, विज्ञापन, सेशन रिकॉर्डिंग या बाहरी फ़ॉन्ट स्क्रिप्ट नहीं हैं। हम यह दावा नहीं करते कि कोई भी डेटा इकट्ठा नहीं होता।"],
      ["लोकेशन मेटाडेटा का क्या होता है?", "एक्सपोर्ट पिक्सेल से नई इमेज बनाता है, मूल EXIF/GPS डेटा कॉपी नहीं करता। आउटपुट के रिज़ॉल्यूशन की जानकारी रह सकती है। मूल फ़ाइल नहीं बदलती। इमेज में दिखाई दे रही निजी जानकारी मेटाडेटा हटाने से नहीं छिपती।"],
      ["जाँच किस बात की गारंटी है?", "असली आउटपुट बाइट, पिक्सेल माप और फ़ॉर्मैट को आपकी सेटिंग से जाँचा जाता है। पहचान, चेहरे की उपयुक्तता, हस्ताक्षर का स्वामित्व या पोर्टल पर स्वीकृति की जाँच नहीं होती। न्यूनतम साइज़ पूरा करने के लिए अतिरिक्त बाइट नहीं जोड़े जाते। इमेज देखें और आधिकारिक निर्देश मानें।"],
      ["मौजूदा सीमाएँ क्या हैं?", "केवल स्थिर JPG, PNG और WebP इनपुट हैं। HEIC, PDF और एनिमेशन एडिटिंग समर्थित नहीं हैं। JPEG एक्सपोर्ट 96, 200 और 300 DPI पर है; PNG/WebP ब्राउज़र के एक्सपोर्ट का उपयोग करते हैं। यह शुरुआती संस्करण है; सफल फ़ोन या ऑटोमेटेड टेस्ट स्वतंत्र सुरक्षा ऑडिट या पूर्ण सुरक्षा की गारंटी नहीं हैं।"],
      ["पेड सुविधाओं का क्या होगा?", "मूल एडिटिंग और अलग-अलग डाउनलोड मुफ़्त हैं। वैकल्पिक ZIP और प्रिंट-शीट पास के लिए अलग Razorpay चेकआउट है। भुगतान में ईमेल और ज़रूरी पेमेंट-सत्र कुकी है; ऑर्डर, भुगतान इवेंट और पास की जानकारी PostgreSQL में रहती है। फ़ोटो, फ़ाइल नाम या इमेज मेटाडेटा भुगतान अनुरोध में नहीं जाते। रिस्टोर कोड निजी रखें। एडिटर में पेमेंट SDK नहीं चलता।"],
    ],
    verifyTitle: "ऑफ़लाइन जाँच करके देखें", steps: ["एडिटर लोड करें, फ़ोटो या हस्ताक्षर चुनें और एक बार एक्सपोर्ट करें।", "पेज खुला रखें और उस डिवाइस का इंटरनेट बंद करें। पेज रीलोड न करें।", "साइज़ या क्रॉप बदलें, फिर एक्सपोर्ट करें और डाउनलोड खोलें।", "वेबसाइट दोबारा लोड करने के लिए इंटरनेट चालू करें। ऑफ़लाइन इंस्टॉल सुविधा अभी नहीं है।"],
    devTitle: "और गहराई से जाँचें", dev: "कंप्यूटर पर ब्राउज़र डेवलपर टूल → Network खोलें, अनुरोध सूची साफ़ करें, फिर इमेज चुनें, एडिट और डाउनलोड करें। फ़ोटो अपलोड का कोई अनुरोध नहीं होना चाहिए। ऐप की फ़ाइलों के अनुरोध दिख सकते हैं। यह उस सत्र की जाँच है, हर भविष्य के संस्करण की स्थायी गारंटी नहीं।",
    caution: "मूल फ़ाइलें सुरक्षित रखें। पेज बंद करने से मौजूदा बदलाव खो जाते हैं; डिवाइस की डाउनलोड की गई फ़ाइलें नहीं हटतीं।",
  },
};

export default function TrustContent() {
  const [lang, setLang] = useState<"en" | "hi">("en"); const t = copy[lang];
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return <><header className="site-header"><a className="brand" href="/"><span className="brand-icon"><Icon name="shield" size={23}/></span>PhotoResizeKaro.</a><button className="language" onClick={() => setLang(lang === "en" ? "hi" : "en")} aria-label={lang === "en" ? "Switch to Hindi" : "Switch to English"}>{lang === "en" ? "अ / EN" : "EN / अ"}</button></header><main className="trust-page"><a href="/" className="back-to-photo">← {t.back}</a><div className="trust-page-hero"><p className="eyebrow">{t.badge}</p><h1>{t.title}</h1><p>{t.intro}</p><small>{t.updated}</small></div><section className="offline-proof"><Icon name="shield" size={28}/><div><h2>{t.verifyTitle}</h2><ol>{t.steps.map((step) => <li key={step}>{step}</li>)}</ol></div></section><div className="trust-articles">{t.cards.map(([heading, body]) => <article key={heading}><h2>{heading}</h2><p>{body}</p></article>)}</div><section className="trust-dev-note"><h2>{t.devTitle}</h2><p>{t.dev}</p></section><p className="trust-closing-note">{t.caution}</p></main></>;
}
