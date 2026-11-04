import { cropRect, encodeToLimit, validateSettings, type EditSettings } from "./image-core";
import { withJpegDpi } from "./jpeg-dpi";
class WorkerUnavailable extends Error {}

export async function processImage(file: File, settings: EditSettings, signal: AbortSignal): Promise<{ blob: Blob; fits: boolean }> {
  validateSettings(settings);
  let bitmap = await createImageBitmap(file);
  if (signal.aborted) { bitmap.close(); throw new DOMException("Cancelled", "AbortError"); }
  if (typeof OffscreenCanvas !== "undefined" && "convertToBlob" in OffscreenCanvas.prototype) {
    try {
      return await new Promise<{ blob: Blob; fits: boolean }>((resolve, reject) => {
        let worker: Worker;
        try { worker = new Worker(new URL("../workers/image-worker.ts", import.meta.url)); }
        catch { reject(new WorkerUnavailable()); return; }
        const cleanup = () => { clearTimeout(timeout); signal.removeEventListener("abort", stop); worker.terminate(); };
        const stop = () => { cleanup(); reject(new DOMException("Cancelled", "AbortError")); };
        const timeout = setTimeout(() => { cleanup(); reject(new Error("Processing took too long. Try a smaller image.")); }, 45000);
        signal.addEventListener("abort", stop, { once: true });
        worker.onmessage = (event) => { cleanup(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data); };
        worker.onerror = (event) => { event.preventDefault(); cleanup(); reject(new WorkerUnavailable()); };
        try { worker.postMessage({ bitmap, settings }, [bitmap]); }
        catch { cleanup(); reject(new WorkerUnavailable()); }
      });
    } catch (error) {
      bitmap.close();
      if (signal.aborted || !(error instanceof WorkerUnavailable)) throw error;
      bitmap = await createImageBitmap(file);
    }
  }
  const canvas = document.createElement("canvas");
  let closed = false;
  try {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    canvas.width = settings.width; canvas.height = settings.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    if (settings.format === "image/jpeg") { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const sideways = settings.rotation % 180 !== 0;
    const w = sideways ? bitmap.height : bitmap.width, h = sideways ? bitmap.width : bitmap.height;
    const rect = cropRect(w, h, canvas.width, canvas.height, settings.zoom, settings.x, settings.y);
    ctx.imageSmoothingQuality = "high";
    ctx.scale(canvas.width / rect.width, canvas.height / rect.height);
    ctx.translate(-rect.x, -rect.y); ctx.translate(w / 2, h / 2); ctx.rotate(settings.rotation * Math.PI / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    bitmap.close(); closed = true;
    const result = await encodeToLimit(async (quality) => {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((output) => output ? resolve(output) : reject(new Error("Could not export image.")), settings.format, quality));
      return settings.format === "image/jpeg" && settings.dpi ? withJpegDpi(blob, settings.dpi) : blob;
    }, settings.format, settings.maxBytes, settings.minBytes);
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (result.blob.type !== settings.format) throw new Error("Your browser cannot export this format. Try JPG or PNG.");
    return result;
  } finally { if (!closed) bitmap.close(); canvas.width = 1; canvas.height = 1; }
}
