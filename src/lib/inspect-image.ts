export const MAX_INPUT_BYTES = 25_000_000;
export const MAX_INPUT_PIXELS = 24_000_000;
export const MAX_INPUT_SIDE = 12000;
const HEADER_BUDGET = 524288;

function dimensions(width: number, height: number, mime: "image/jpeg" | "image/png" | "image/webp") {
  if (!width || !height) throw new Error("The image has invalid dimensions.");
  if (width > MAX_INPUT_SIDE || height > MAX_INPUT_SIDE || width * height > MAX_INPUT_PIXELS) throw new Error("Choose an image up to 24 megapixels and 12,000 pixels per side.");
  return { width, height, mime };
}

// Inspect dimensions before allocating decoded pixel buffers.
export async function inspectImage(file: Blob) {
  if (file.size > MAX_INPUT_BYTES) throw new Error("Choose a file smaller than 25 MB.");
  const bytes = new Uint8Array(await file.slice(0, HEADER_BUDGET).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
  if (bytes.length >= 24 && bytes[0] === 137 && text(1, 7) === "PNG\r\n\x1a\n" && text(12, 4) === "IHDR") {
    const result = dimensions(view.getUint32(16), view.getUint32(20), "image/png");
    let offset = 8;
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset), type = text(offset + 4, 4);
      if (offset + 12 + length > file.size) throw new Error("This PNG is incomplete or corrupt.");
      if (type === "acTL") throw new Error("Animated images are not supported. Choose a still photo.");
      if (type === "IDAT") return result;
      offset += length + 12;
    }
    throw new Error("Could not inspect the PNG safely. Try exporting it as a standard JPG or PNG.");
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > file.size) throw new Error("This JPG is incomplete or corrupt.");
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8 || offset + 7 > bytes.length) break;
        return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3), "image/jpeg");
      }
      offset += length;
    }
    throw new Error("Could not inspect the JPG safely. Try a standard JPG with less embedded metadata.");
  }
  if (bytes.length >= 25 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    if (view.getUint32(4, true) + 8 > file.size) throw new Error("This WebP is incomplete or corrupt.");
    const kind = text(12, 4), offset = 20;
    if (kind === "ANIM" || kind === "ANMF" || (kind === "VP8X" && (bytes[offset] & 2))) throw new Error("Animated images are not supported. Choose a still photo.");
    if (kind === "VP8X" && bytes.length >= 30) return dimensions(1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16), "image/webp");
    if (kind === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) return dimensions(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff, "image/webp");
    if (kind === "VP8L" && bytes[20] === 0x2f) return dimensions(1 + bytes[21] + ((bytes[22] & 63) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10), "image/webp");
    throw new Error("Could not inspect this WebP safely. Try a JPG or PNG.");
  }
  throw new Error("Choose JPG, PNG or WebP. HEIC, PDF and GIF are not supported yet.");
}
