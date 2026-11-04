// Change only JFIF density metadata. Pixel data and quality remain unchanged.
export async function withJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  if (blob.type !== "image/jpeg") return blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Invalid JPEG output.");
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes[offset + 2] * 256 + bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    if (marker === 0xe0 && length >= 16 && String.fromCharCode(...bytes.slice(offset + 4, offset + 9)) === "JFIF\0") {
      bytes[offset + 11] = 1;
      bytes[offset + 12] = dpi >> 8; bytes[offset + 13] = dpi & 255;
      bytes[offset + 14] = dpi >> 8; bytes[offset + 15] = dpi & 255;
      return new Blob([bytes], { type: "image/jpeg" });
    }
    offset += length + 2;
  }
  const segment = new Uint8Array([0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
  return new Blob([bytes.slice(0, 2), segment, bytes.slice(2)], { type: "image/jpeg" });
}
