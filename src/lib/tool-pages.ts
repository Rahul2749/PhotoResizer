import type { ToolSetup } from "./tool-setup";

type Section = { title: string; body: string };
export type ToolPageData = {
  slug: string; title: string; description: string; heading: string; intro: string;
  setup: ToolSetup; settings: [string, string][]; sections: Section[]; faqs: [string, string][];
};
const kbSetup = (kb: number): ToolSetup => ({ kind: "photo", label: `${kb} KB maximum · JPG output · dimensions stay editable`, rule: { minKB: 0, maxKB: kb, format: "image/jpeg", dimensionKind: "unspecified", dimensions: { en: `This tool starts with a ${kb} KB maximum. Set the pixel dimensions required by your form; there is no universal photo size for this KB limit.`, hi: `यह टूल अधिकतम ${kb} KB से शुरू होता है। अपने फ़ॉर्म के पिक्सेल माप भरें; इस KB सीमा का कोई एक सार्वभौमिक माप नहीं है।` } } });

export const toolPages: ToolPageData[] = [
  {
    slug: "resize-image-to-20kb", title: "Resize Image to 20KB Online Free | PhotoResizeKaro",
    description: "Compress a photo to a 20KB maximum in your browser. Set dimensions, crop and check the actual output size. Free JPG, PNG and WebP input; no photo uploads.",
    heading: "Resize an image to 20 KB", intro: "Start with a 20 KB maximum. Choose your photo, keep the dimensions your form requires, then check the actual size before downloading.", setup: kbSetup(20),
    settings: [["Maximum size", "20 KB (20,000 bytes), editable"], ["Pixel dimensions", "Set these from your form"], ["Starting output", "JPG; PNG and WebP are also available"]],
    sections: [
      { title: "A small file still needs a readable subject", body: "A 20 KB limit leaves little room for fine detail. Crop unused background so the face or signature uses more of the available pixels. Avoid repeatedly saving an already compressed file: start from the original when you need another attempt. Use the result preview to check eyes, outlines and handwriting at their final size." },
      { title: "Keep KB and pixels separate", body: "20 KB describes file weight, not a width or height. Enter any pixel requirement separately. This editor preserves your selected dimensions while trying encoder quality levels; it will report a failed size check rather than silently shrink the dimensions or add padding. For a handwritten signature, the signature tool provides a separate 10–20 KB starting range." },
      { title: "If the result cannot fit", body: "Try JPG for a photograph if the portal accepts it. If the smallest result is still too large, reduce dimensions only when the form permits that change, or crop closer and process again. A file under the limit can still fail a portal’s background, framing or identity checks." }
    ], faqs: [["Does this make a file exactly 20,000 bytes?", "No. The setting is a maximum. The encoder reports the real file size; it does not add filler bytes to manufacture an exact KB value."], ["Can I use a PNG or WebP original?", "Yes. Still JPG, PNG and WebP inputs are supported. You can choose JPG output when transparency is not needed. HEIC, PDF and animated files are not supported."]]
  },
  {
    slug: "resize-image-to-50kb", title: "Resize Image to 50KB Online Free | PhotoResizeKaro",
    description: "Reduce a photo to a 50KB maximum with editable dimensions and crop controls. Check actual JPG output bytes before downloading. Free, with local image processing.",
    heading: "Resize an image to 50 KB", intro: "Prepare a photo for a 50 KB upload limit. The maximum is already selected; dimensions, minimum size and format remain under your control.", setup: kbSetup(50),
    settings: [["Maximum size", "50 KB (50,000 bytes), editable"], ["Minimum size", "0 by default; add a lower bound if required"], ["Image handling", "Local crop, rotate, resize and compression"]],
    sections: [
      { title: "Read the whole size requirement", body: "A form may say “up to 50 KB” or give a range such as 20–50 KB. Those are different requirements. Enter the lower bound in Minimum only if your current instructions require it. The result checks compare the actual exported bytes with both limits, so a file that is too small is flagged as well as one that is too large." },
      { title: "Choose shape before compression", body: "Set width and height from the form, then use crop position and zoom to frame the subject. Changing pixel dimensions after processing invalidates the earlier result, so process again before downloading. If your instructions specify 200 × 230 pixels, use the dedicated pixel tool as a convenient starting point; that size is not a rule for every application." },
      { title: "Use JPG when the form asks for a photograph", body: "PNG can be larger because it preserves lossless detail and transparency. Changing to JPG produces a new file and places transparency on white. Download that result rather than renaming a PNG with a .jpg extension. Always open the saved image once to check it." }
    ], faqs: [["Why is my photo still rejected below 50 KB?", "Check the minimum KB, pixel dimensions and actual format. Portals may also check the background, face position, photo age or require live capture; a byte-size check does not verify those rules."], ["Will my photo be uploaded for compression?", "No. Pixels are processed on your device. Optional anonymous tool counts use broad size ranges and can be disabled; they do not include the image or its filename."]]
  },
  {
    slug: "resize-image-to-100kb", title: "Resize Image to 100KB Online Free | PhotoResizeKaro",
    description: "Compress an image under a 100KB maximum without changing your selected pixel dimensions silently. Crop, preview and download free; photos stay on your device.",
    heading: "Resize an image to 100 KB", intro: "Use a 100 KB maximum when your upload instructions allow it. Keep enough pixels for the subject and inspect the final preview before saving.", setup: kbSetup(100),
    settings: [["Maximum size", "100 KB (100,000 bytes), editable"], ["Pixel dimensions", "Independent of the KB limit"], ["Cost", "Core processing and individual downloads are free"]],
    sections: [
      { title: "Use the available room for detail", body: "If the form allows 100 KB, there is no benefit to forcing a photo down to 20 KB merely because it is smaller. More room can preserve hair, edges and small lettering. The compression routine tries to retain quality within the selected maximum; the final size depends on the picture, dimensions, format and your browser’s encoder." },
      { title: "Avoid enlarging a small original", body: "Increasing width or height creates more pixels but does not recover missing detail. Start with a clear original, crop to the correct shape and resize to the required dimensions. Judge the downloaded result at the size the receiving portal will show it, especially if the original came from a screenshot or messaging app." },
      { title: "Format and file size are separate checks", body: "The editor checks the actual encoded format rather than trusting the filename. JPG is often practical for photographs; PNG is useful when transparency must remain, and WebP needs explicit support from the receiving website. Choose the format required by your own form even if another one makes a smaller file." }
    ], faqs: [["Is 100 KB the same as 100 pixels?", "No. KB measures file size; pixels measure width and height. A portal can specify both, so set and check both requirements."], ["Can I prepare only one photo?", "Yes. You can download directly from the Photo editor without preparing a signature or buying a ZIP pass."]]
  },
  {
    slug: "resize-image-to-200kb", title: "Resize Image to 200KB Online Free | PhotoResizeKaro",
    description: "Reduce a photo to a 200KB maximum with local crop and resize controls. See the actual output size and dimensions, then download without login or watermark.",
    heading: "Resize an image to 200 KB", intro: "Reduce a large camera photo for a 200 KB limit. Start from the original, set any required dimensions, and compare the checked result with your instructions.", setup: kbSetup(200),
    settings: [["Maximum size", "200 KB (200,000 bytes), editable"], ["Supported originals", "Still JPG, PNG and WebP"], ["Input safety limits", "25 MB, 24 megapixels and 12,000 pixels per side"]],
    sections: [
      { title: "Large input does not require a large upload", body: "Modern camera files can be several megabytes even when a form displays only a small portrait. Select the original and enter the intended output dimensions. Cropping a large background and resizing to a suitable pixel size can reduce the work compression needs to do. The tool does not need to send that large original over the network." },
      { title: "Do not sacrifice readability just to hit a number", body: "A 200 KB maximum is an upper bound, not a request to fill every byte. Check that the subject and any necessary text remain readable after processing. If you are preparing a photograph of a document, follow the portal’s document-specific rules; this image tool does not convert PDF documents or guarantee text-recognition accuracy." },
      { title: "Keep your original as a fallback", body: "The original file remains unchanged. Save the processed copy separately, open it, and check the portal preview when uploading. If the portal expects a different size, start another export from the original rather than recompressing the downloaded copy over and over." }
    ], faqs: [["Can I use a different maximum, such as 150 or 300 KB?", "Yes. Change the editable custom limit. The page starts at 200 KB but does not lock the controls."], ["Why was a small file rejected before editing?", "Compressed bytes can hide very large decoded dimensions. The editor also checks pixel and format limits before decoding to avoid allocating an unsafe amount of device memory."]]
  },
  {
    slug: "signature-resizer", title: "Signature Resizer — 10KB to 20KB Online | PhotoResizeKaro",
    description: "Crop and resize a signature with a 10–20KB starting range. Set the pixel dimensions your form requires and check readability. Free downloads; no signature uploads.",
    heading: "Signature resizer for online forms", intro: "The Signature tab is ready with a 10–20 KB range. Crop unused paper, enter your form’s dimensions and keep every stroke readable.",
    setup: { kind: "signature", label: "Signature selected · 10–20 KB starting range · editable dimensions", rule: { ...kbSetup(20).rule, minKB: 10, dimensions: { en: "10–20 KB is a starting range, not a universal signature rule. Enter any fixed dimensions from your application instructions.", hi: "10–20 KB शुरुआती रेंज है, सभी हस्ताक्षरों का नियम नहीं। अपने आवेदन के निश्चित पिक्सेल माप भरें।" } } },
    settings: [["Selected file", "Signature"], ["Starting range", "10–20 KB, editable"], ["Pixel dimensions", "Read these from the current form instructions"]],
    sections: [
      { title: "Start with clear handwriting and even light", body: "Use a clear image of a signature you are entitled to submit. Keep the camera parallel to the paper so the strokes do not appear skewed. Avoid shadows crossing the handwriting. This tool crops and encodes an existing image; it does not draw, imitate or verify somebody’s signature." },
      { title: "Crop the paper, not the strokes", body: "Remove empty margins while keeping the first and last strokes inside the crop. A wide signature forced into a square can become unreadable; set the required width and height first, then inspect the crop preview. Do not assume that 140 × 60 pixels, or any other example seen online, applies to every exam cycle." },
      { title: "When a signature is below the minimum", body: "Simple handwriting can produce a very small JPG even at high encoder quality. If your current form has a lower bound, the result must pass it as well as the upper bound. This editor does not append filler bytes to make a file heavier. Try a clearer original or larger permitted dimensions, and recheck the actual rules." }
    ], faqs: [["Can I make a signature under 10 KB instead?", "Yes. Set Minimum to 0 unless a lower bound is required, and change Maximum to 10. The starting 10–20 KB range is editable."], ["Does a passing result prove the signature will be accepted?", "No. Technical checks cover bytes, dimensions and format. The authority may also check handwriting style, ink colour, clarity or other rules stated in its notice."]]
  },
  {
    slug: "resize-image-to-200x230", title: "Resize Image to 200×230 Pixels Online | PhotoResizeKaro",
    description: "Crop and resize a photo to 200×230 pixels with an editable 50KB starting maximum. Verify actual dimensions and size before downloading. Free local processing.",
    heading: "Resize a photo to 200 × 230 pixels", intro: "Width and height are preset to 200 × 230 pixels. The separate 50 KB maximum is a starting value—change it to match your own form.",
    setup: { kind: "photo", label: "200 × 230 pixels · 50 KB starting maximum · JPG", rule: { ...kbSetup(50).rule, width: 200, height: 230, dimensionKind: "preferred", dimensions: { en: "200 × 230 pixels is the task selected on this page, not a requirement for every bank or exam. The KB range remains editable.", hi: "200 × 230 पिक्सेल इस पेज का चुना काम है, हर बैंक या परीक्षा का नियम नहीं। KB रेंज बदल सकती है।" } } },
    settings: [["Width × height", "200 × 230 pixels"], ["Maximum size", "50 KB initially; check your actual rule"], ["Crop behaviour", "Fills the selected shape without stretching"]],
    sections: [
      { title: "Match the portrait shape without distortion", body: "A square or wide original has a different shape from 200 × 230. The crop preview shows which edges will be removed so the subject is not stretched to fit. Move the crop and adjust zoom until the head and any required margins remain visible. If the framing cannot work, use a better original instead of cutting off the subject." },
      { title: "Check the dimensions after export", body: "The final result is checked against 200 pixels wide and 230 pixels high, in that order. Rotating changes the framing, so inspect the preview before processing again. The saved filename includes output dimensions as a convenience, but the actual file checks use decoded image dimensions rather than trusting a filename." },
      { title: "A pixel size is not an exam certificate", body: "Some instructions use this portrait shape, while others use different dimensions or live photo capture. This page is a general pixel-resize tool and does not claim to follow every bank, government or recruitment requirement. Read the current official notice and set the byte range and format independently." }
    ], faqs: [["Are 200 × 230 pixels and 200 × 230 mm the same?", "No. Pixels describe a digital image. Millimetres describe a physical print size, which also depends on DPI."], ["Can I change the width and height?", "Yes. These are prefilled starting values. Changing them invalidates the old result, and you must process again before downloading a checked replacement."]]
  },
  {
    slug: "passport-photo-resizer", title: "Passport-Style Photo Resizer — 35×45 mm | PhotoResizeKaro",
    description: "Resize a passport-style photo using editable 35×45 mm, 300 DPI starting settings. Check pixels, JPG resolution and KB size locally. Follow your country’s actual rules.",
    heading: "Passport-style photo resizer", intro: "Start with a 35 × 45 mm example at 300 DPI. Check your document’s official dimensions and portrait rules before using these editable settings.",
    setup: { kind: "photo", label: "35 × 45 mm example · 300 DPI · 100 KB maximum", rule: { ...kbSetup(100).rule, width: 413, height: 531, dpi: 300, dimensionKind: "derived", dimensions: { en: "35 × 45 mm at 300 DPI gives approximately 413 × 531 pixels after rounding. This is a passport-style example, not a universal official specification.", hi: "300 DPI पर 35 × 45 mm राउंड करने के बाद लगभग 413 × 531 पिक्सेल है। यह पासपोर्ट-स्टाइल उदाहरण है, सार्वभौमिक आधिकारिक नियम नहीं।" } } },
    settings: [["Example physical size", "35 × 45 mm (3.5 × 4.5 cm)"], ["JPEG resolution", "300 DPI initially"], ["Rounded pixel dimensions", "413 × 531 pixels; dimensions and KB limit are editable"]],
    sections: [
      { title: "Choose the country and document rules first", body: "Passport, visa, admission and job-application photographs do not all use the same dimensions. The correct background, head position, expression and permitted editing can also differ. This tool changes technical image settings; it is not an official passport checker, biometric face validator or guarantee of acceptance." },
      { title: "Understand centimetres, pixels and DPI", body: "For a print-size calculation, pixels equal centimetres divided by 2.54 and multiplied by DPI. At 300 DPI, 3.5 × 4.5 cm rounds to 413 × 531 pixels. Rounding means the resulting physical size is approximate. Change the unit to centimetres if you want to enter another physical size, and confirm the selected JPEG DPI." },
      { title: "Prepare a file or an optional print sheet", body: "Individual image downloads are free. JPG export includes the selected resolution metadata; PNG and WebP use the browser’s normal export behaviour. A separate paid print-sheet pass can arrange a prepared photo on A4, but a sheet does not correct portrait framing. Print at 100% or Actual size, and measure a sample before making multiple copies." }
    ], faqs: [["Will changing DPI improve a blurry original?", "No. DPI controls the relationship between pixels and print size. It does not recover missing image detail or repair a blurred face."], ["Does this remove the background?", "No. The current tool provides crop, rotation, resize and compression. Start with a photograph that already meets the document’s background requirements."]]
  }
];
