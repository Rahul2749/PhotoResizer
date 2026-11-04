export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";
export type EditSettings = {
  width: number; height: number; format: ImageFormat; maxBytes: number; minBytes?: number; dpi?: number;
  rotation: number; zoom: number; x: number; y: number;
};

export function validateSettings(settings: EditSettings) {
  const { width, height, maxBytes, rotation, zoom, x, y, format } = settings;
  const minBytes = settings.minBytes ?? 0;
  const dpi = settings.dpi ?? 96;
  if (![width, height, minBytes, maxBytes, rotation, zoom, x, y].every(Number.isFinite)) throw new Error("Enter valid numbers for the image settings.");
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error("Choose dimensions between 1 and 4096 pixels.");
  if (maxBytes < 1000 || maxBytes > 10_000_000) throw new Error("Choose a size limit between 1 and 10,000 KB.");
  if (minBytes < 0 || minBytes > maxBytes) throw new Error("Minimum file size must be between 0 and the maximum size.");
  if (!Number.isInteger(dpi) || dpi < 36 || dpi > 1200) throw new Error("Choose a resolution between 36 and 1200 DPI.");
  if (![0, 90, 180, 270].includes(rotation) || zoom < 1 || zoom > 3 || Math.abs(x) > 1 || Math.abs(y) > 1) throw new Error("Reset the crop settings and try again.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(format)) throw new Error("Choose JPG, PNG or WebP.");
}

export function cropRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, zoom = 1, x = 0, y = 0) {
  const aspect = targetWidth / targetHeight;
  let width = sourceWidth, height = sourceHeight;
  if (sourceWidth / sourceHeight > aspect) width = sourceHeight * aspect;
  else height = sourceWidth / aspect;
  width /= zoom; height /= zoom;
  return { x: (sourceWidth - width) * (x + 1) / 2, y: (sourceHeight - height) * (y + 1) / 2, width, height };
}

export function toPixels(value: number, unit: "px" | "cm" | "%", dpi: number, sourceDimension: number) {
  if (unit === "cm") return Math.round(value / 2.54 * dpi);
  if (unit === "%") return Math.round(sourceDimension * value / 100);
  return Math.round(value);
}

// Keep the best output at or below the byte ceiling. Dimensions never silently change.
export async function encodeToLimit(encode: (quality?: number) => Promise<Blob>, format: ImageFormat, maxBytes: number, minBytes = 0) {
  if (format === "image/png") {
    const blob = await encode();
    return { blob, fits: blob.size >= minBytes && blob.size <= maxBytes };
  }
  const high = await encode(1);
  if (high.size <= maxBytes) return { blob: high, fits: high.size >= minBytes };
  const low = await encode(0.08);
  if (low.size > maxBytes) return { blob: low, fits: false };
  let best = low, left = 0.08, right = 1;
  for (let attempt = 0; attempt < 8; attempt++) {
    const quality = (left + right) / 2;
    const blob = await encode(quality);
    if (blob.size <= maxBytes) { best = blob; left = quality; }
    else right = quality;
  }
  return { blob: best, fits: best.size >= minBytes };
}

export function fileChecks(file: { bytes: number; width: number; height: number; mime: string }, requirements: { minBytes: number; maxBytes: number; width: number; height: number; format: string }) {
  return {
    size: file.bytes >= requirements.minBytes && file.bytes <= requirements.maxBytes,
    dimensions: file.width === requirements.width && file.height === requirements.height,
    format: file.mime === requirements.format,
  };
}
