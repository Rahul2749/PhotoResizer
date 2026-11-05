export const toolIndex = [
  { slug: "resize-image-to-20kb", name: "Resize image to 20 KB", summary: "A 20 KB maximum, with your chosen pixel dimensions." },
  { slug: "resize-image-to-50kb", name: "Resize image to 50 KB", summary: "Prepare a photo under a 50 KB upload limit." },
  { slug: "resize-image-to-100kb", name: "Resize image to 100 KB", summary: "Keep more photo detail within a 100 KB maximum." },
  { slug: "resize-image-to-200kb", name: "Resize image to 200 KB", summary: "Compress a larger photo without guessing the final bytes." },
  { slug: "signature-resizer", name: "Signature resizer", summary: "Start with a 10–20 KB range and check every stroke." },
  { slug: "resize-image-to-200x230", name: "Resize to 200 × 230 pixels", summary: "Set pixel dimensions and a separate, editable KB limit." },
  { slug: "passport-photo-resizer", name: "Passport-style photo resizer", summary: "Start at 35 × 45 mm, 300 DPI; follow your actual rules." }
] as const;
export const publicToolPaths = toolIndex.map((tool) => `/${tool.slug}`);
