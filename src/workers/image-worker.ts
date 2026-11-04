import { cropRect, encodeToLimit, validateSettings, type EditSettings } from "../lib/image-core";
import { withJpegDpi } from "../lib/jpeg-dpi";

self.onmessage = async (event: MessageEvent<{ bitmap: ImageBitmap; settings: EditSettings }>) => {
  const { bitmap, settings } = event.data;
  let canvas: OffscreenCanvas | undefined, closed = false;
  try {
    validateSettings(settings);
    canvas = new OffscreenCanvas(settings.width, settings.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing is unavailable in this browser.");
    if (settings.format === "image/jpeg") { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const sideways = settings.rotation % 180 !== 0;
    const w = sideways ? bitmap.height : bitmap.width, h = sideways ? bitmap.width : bitmap.height;
    const rect = cropRect(w, h, canvas.width, canvas.height, settings.zoom, settings.x, settings.y);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.scale(canvas.width / rect.width, canvas.height / rect.height);
    ctx.translate(-rect.x, -rect.y); ctx.translate(w / 2, h / 2); ctx.rotate(settings.rotation * Math.PI / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    bitmap.close(); closed = true;
    const output = canvas;
    const result = await encodeToLimit(async (quality) => {
      const blob = await output.convertToBlob({ type: settings.format, quality });
      return settings.format === "image/jpeg" && settings.dpi ? withJpegDpi(blob, settings.dpi) : blob;
    }, settings.format, settings.maxBytes, settings.minBytes);
    if (result.blob.type !== settings.format) throw new Error("Your browser cannot export that format. Try JPG or PNG.");
    self.postMessage(result);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Unable to process this image." });
  } finally { if (!closed) bitmap.close(); if (canvas) { canvas.width = 1; canvas.height = 1; } }
};
