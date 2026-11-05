const content = {
  en: {
    heading: "How to resize a photo or signature online",
    steps: [
      ["Choose your image", "Use the Photo or Signature tab and select a still JPG, PNG or WebP image. The file opens on your device; the editor does not upload it."],
      ["Set dimensions and a KB limit", "Choose 20 KB, 50 KB, 100 KB or a custom maximum. Enter your form’s required pixel dimensions, crop extra margins and rotate if needed. You can also set a minimum file size."],
      ["Check and download", "Select Resize & compress. Review the actual file size, dimensions and format, then open the downloaded image to check clarity. Prepare both files to use the combined review."],
    ],
    limitsTitle: "Which photo or signature size should I choose?",
    limitsIntro: "Follow your application portal’s requirements. These common limits are starting points, not universal exam rules.",
    limits: [
      ["20 KB", "Use a 20 KB maximum for a signature or small photo when your form allows it. Crop unused margins first and check that every signature stroke remains readable."],
      ["50 KB", "Use a 50 KB maximum when the portal requests that limit. Keep the required pixel dimensions; try JPG for photographs if PNG is too large."],
      ["100 KB or custom", "Use 100 KB or a custom maximum for a different requirement. If your form gives a range, enter both its minimum and maximum, then check the actual exported bytes."],
    ],
    faqTitle: "Photo resizing questions",
    faqs: [
      ["What is the difference between resizing and compressing?", "Resizing changes pixel dimensions, such as 600 × 600. Compression changes file size in KB. A form may require both. This tool checks them separately and does not silently change your chosen dimensions to fit a KB limit."],
      ["Can I resize a photo to exactly 20 KB?", "The KB setting is a maximum, not a promise of an exact byte count. Image content and browser encoding affect the result. The editor reports the actual size without adding padding to reach a minimum. If the file is outside your range, adjust the settings before downloading a validated result."],
      ["Which format is best for photos and signatures?", "Follow the portal’s format rule first. JPG usually produces smaller photographs and flattens transparency onto white. PNG preserves transparency but can be larger. WebP is useful where the receiving website accepts it."],
      ["Can I resize passport-size photos in centimetres?", "Yes. Select centimetres and enter the required width and height. For JPG, choose 96, 200 or 300 DPI; the editor converts centimetres into pixels and writes JPEG resolution metadata. DPI does not create detail or guarantee official portrait framing."],
      ["Are my photos and signatures uploaded?", "No. Selected images are processed in browser memory, without an account or cloud history. The host serves application files and may retain technical request information. Closing or reloading ends the editing session; original files and downloads stay on your device."],
      ["Is this photo and signature resizer free?", "Yes. Core editing and individual downloads are free, without a watermark or account. Optional ZIP and print-sheet passes are paid. It accepts still JPG, PNG and WebP up to 25 MB, 24 megapixels and 12,000 pixels per side. HEIC, PDF, GIF and animation editing are not supported."],
      ["Will an exam portal accept my exported image?", "The checks cover your selected byte range, dimensions and format. Portals can also require particular backgrounds, face framing, capture dates, live photos or signature appearance. Read the current official notice. Optional presets show their source, cycle and review date; they do not guarantee acceptance."],
    ],
    help: "How local processing works", contact: "Report a problem or suggest an improvement", back: "Back to the photo and signature editor",
  },
  hi: {
    heading: "ऑनलाइन फ़ोटो या हस्ताक्षर कैसे रीसाइज़ करें",
    steps: [
      ["इमेज चुनें", "फ़ोटो या हस्ताक्षर टैब से स्थिर JPG, PNG या WebP चुनें। फ़ाइल आपके डिवाइस पर खुलती है; एडिटर उसे अपलोड नहीं करता।"],
      ["माप और KB सीमा चुनें", "20 KB, 50 KB, 100 KB या अपनी अधिकतम सीमा चुनें। फ़ॉर्म के पिक्सेल माप भरें, अतिरिक्त किनारे क्रॉप करें और ज़रूरत पर घुमाएँ। न्यूनतम साइज़ भी चुन सकते हैं।"],
      ["जाँचें और डाउनलोड करें", "रीसाइज़ और कंप्रेस करें दबाएँ। असली साइज़, माप और फ़ॉर्मैट देखें, फिर डाउनलोड खोलकर स्पष्टता जाँचें। दोनों फ़ाइलें तैयार करके साथ में समीक्षा करें।"],
    ],
    limitsTitle: "फ़ोटो या हस्ताक्षर के लिए कौन-सा साइज़ चुनें?",
    limitsIntro: "अपने आवेदन पोर्टल के नियम मानें। ये आम सीमाएँ शुरुआती उदाहरण हैं, सभी परीक्षाओं के नियम नहीं।",
    limits: [
      ["20 KB", "फ़ॉर्म अनुमति दे तो हस्ताक्षर या छोटी फ़ोटो के लिए अधिकतम 20 KB चुनें। अतिरिक्त किनारे क्रॉप करें और हस्ताक्षर की हर रेखा साफ़ होने की जाँच करें।"],
      ["50 KB", "पोर्टल माँगे तो अधिकतम 50 KB चुनें। ज़रूरी पिक्सेल माप बनाए रखें। PNG बड़ी हो तो फ़ोटो के लिए JPG आज़माएँ।"],
      ["100 KB या कस्टम", "अलग आवश्यकता के लिए 100 KB या अपनी अधिकतम सीमा चुनें। फ़ॉर्म में रेंज हो तो न्यूनतम और अधिकतम दोनों भरें, फिर असली आउटपुट बाइट जाँचें।"],
    ],
    faqTitle: "फ़ोटो रीसाइज़ करने के सवाल",
    faqs: [
      ["रीसाइज़ और कंप्रेस करने में क्या अंतर है?", "रीसाइज़ करने से पिक्सेल माप बदलते हैं, जैसे 600 × 600। कंप्रेस करने से KB में साइज़ बदलता है। फ़ॉर्म दोनों माँग सकता है। टूल दोनों अलग जाँचता है और KB सीमा पूरी करने के लिए चुने माप अपने-आप नहीं बदलता।"],
      ["क्या फ़ोटो ठीक 20 KB बन सकती है?", "KB सेटिंग अधिकतम सीमा है, ठीक उतनी बाइट की गारंटी नहीं। इमेज और ब्राउज़र के अनुसार साइज़ बदलता है। एडिटर असली साइज़ बताता है और न्यूनतम सीमा तक पहुँचने के लिए अतिरिक्त बाइट नहीं जोड़ता। जाँचा हुआ परिणाम डाउनलोड करने से पहले सेटिंग बदलकर सीमा पूरी करें।"],
      ["फ़ोटो और हस्ताक्षर के लिए कौन-सा फ़ॉर्मैट चुनें?", "पहले पोर्टल का नियम मानें। JPG में फ़ोटो अक्सर छोटी बनती है और पारदर्शी हिस्सा सफ़ेद हो जाता है। PNG पारदर्शिता रखती है, लेकिन बड़ी हो सकती है। संबंधित वेबसाइट स्वीकार करे तो WebP उपयोगी है।"],
      ["क्या पासपोर्ट साइज़ फ़ोटो सेंटीमीटर में बना सकते हैं?", "हाँ। सेंटीमीटर चुनकर ज़रूरी चौड़ाई और ऊँचाई भरें। JPG के लिए 96, 200 या 300 DPI चुनें। एडिटर cm को पिक्सेल में बदलता और JPEG रिज़ॉल्यूशन मेटाडेटा सेट करता है। DPI नई डिटेल या आधिकारिक फ़्रेमिंग की गारंटी नहीं देता।"],
      ["क्या फ़ोटो और हस्ताक्षर अपलोड होते हैं?", "नहीं। इमेज बिना खाते या क्लाउड हिस्ट्री के ब्राउज़र मेमोरी में प्रोसेस होती है। होस्ट ऐप की फ़ाइलें देता है और तकनीकी अनुरोध जानकारी रख सकता है। पेज बंद या रीलोड करने से सत्र खत्म होता है; मूल और डाउनलोड की फ़ाइलें डिवाइस पर रहती हैं।"],
      ["क्या यह फ़ोटो और हस्ताक्षर रीसाइज़र मुफ़्त है?", "हाँ। मूल एडिटिंग और अलग-अलग डाउनलोड मुफ़्त हैं, बिना वॉटरमार्क या खाते के। वैकल्पिक ZIP और प्रिंट-शीट पास पेड हैं। यह 25 MB, 24 मेगापिक्सेल और हर तरफ़ 12,000 पिक्सेल तक की स्थिर JPG, PNG और WebP लेता है। HEIC, PDF, GIF और एनिमेशन एडिटिंग समर्थित नहीं है।"],
      ["क्या परीक्षा पोर्टल मेरी इमेज स्वीकार करेगा?", "जाँच में चुनी बाइट सीमा, पिक्सेल माप और फ़ॉर्मैट शामिल हैं। पोर्टल बैकग्राउंड, चेहरे की फ़्रेमिंग, तारीख, लाइव फ़ोटो या हस्ताक्षर के नियम भी दे सकता है। मौजूदा आधिकारिक नोटिस पढ़ें। वैकल्पिक प्रीसेट में स्रोत, चक्र और जाँच की तारीख है; स्वीकृति की गारंटी नहीं।"],
    ],
    help: "लोकल प्रोसेसिंग कैसे होती है", contact: "समस्या बताएँ या सुझाव दें", back: "फ़ोटो और हस्ताक्षर एडिटर पर वापस जाएँ",
  },
};

export default function ToolGuide({ lang }: { lang: "en" | "hi" }) {
  const t = content[lang];
  return <div className="tool-guide">
    <section aria-labelledby="how-to-title"><p className="eyebrow">{lang === "en" ? "THREE SIMPLE STEPS" : "तीन आसान चरण"}</p><h2 id="how-to-title">{t.heading}</h2><ol className="guide-steps">{t.steps.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
    <section aria-labelledby="size-guide-title"><h2 id="size-guide-title">{t.limitsTitle}</h2><p>{t.limitsIntro}</p><div className="size-guide-cards">{t.limits.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section aria-labelledby="faq-title"><h2 id="faq-title">{t.faqTitle}</h2><div className="tool-faq">{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <nav className="guide-links" aria-label={lang === "en" ? "Help and editor" : "मदद और एडिटर"}><a href="#editor">↑ {t.back}</a><a href="/trust" target="_blank" rel="noopener noreferrer">{t.help}</a><a href="/contact" target="_blank" rel="noopener noreferrer">{t.contact}</a></nav>
  </div>;
}
