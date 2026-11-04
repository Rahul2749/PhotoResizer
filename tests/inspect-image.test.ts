import test from "node:test";
import assert from "node:assert/strict";
import { inspectImage, MAX_INPUT_BYTES } from "../src/lib/inspect-image.ts";

function png(width: number, height: number, animated = false) {
  const ihdr = Buffer.alloc(25); ihdr.writeUInt32BE(13); ihdr.write("IHDR", 4); ihdr.writeUInt32BE(width, 8); ihdr.writeUInt32BE(height, 12);
  const animation = Buffer.alloc(20); animation.writeUInt32BE(8); animation.write("acTL", 4);
  const idat = Buffer.alloc(12); idat.write("IDAT", 4);
  return new Blob([Buffer.from([137,80,78,71,13,10,26,10]), ihdr, ...(animated ? [animation] : []), idat]);
}
function jpeg(width: number, height: number) {
  const data = Buffer.from([255,216,255,192,0,11,8,0,0,0,0,1,1,17,0,255,217]);
  data.writeUInt16BE(height, 7); data.writeUInt16BE(width, 9); return new Blob([data]);
}
function webp(kind: string, payload: Uint8Array) {
  const header = Buffer.alloc(20); header.write("RIFF"); header.writeUInt32LE(12 + payload.length, 4); header.write("WEBP", 8); header.write(kind, 12); header.writeUInt32LE(payload.length, 16); return new Blob([header, new Uint8Array(payload)]);
}

test("reads JPEG/PNG dimensions from structure before decoding", async () => {
  assert.deepEqual(await inspectImage(png(1200, 900)), { width:1200, height:900, mime:"image/png" });
  assert.deepEqual(await inspectImage(jpeg(900, 1200)), { width:900, height:1200, mime:"image/jpeg" });
});
test("rejects small compressed files declaring excessive decoded sizes", async () => {
  await assert.rejects(inspectImage(png(8000, 6000)), /24 megapixels/);
  await assert.rejects(inspectImage(jpeg(16000, 100)), /12,000 pixels/);
  await assert.rejects(inspectImage(png(0, 100)), /invalid dimensions/);
});
test("rejects unsupported files, oversized input, and APNG animation", async () => {
  await assert.rejects(inspectImage(new Blob(["GIF89a"])), /Choose JPG/);
  await assert.rejects(inspectImage(new Blob([new Uint8Array(MAX_INPUT_BYTES + 1)])), /25 MB/);
  await assert.rejects(inspectImage(png(100, 100, true)), /Animated/);
});
test("reads extended/lossy/lossless WebP and rejects animation", async () => {
  const extended = new Uint8Array(10); extended[4] = 99; extended[7] = 49;
  assert.deepEqual(await inspectImage(webp("VP8X", extended)), {width:100,height:50,mime:"image/webp"});
  extended[0] = 2; await assert.rejects(inspectImage(webp("VP8X", extended)), /Animated/);
  const lossy = new Uint8Array([0,0,0,157,1,42,100,0,50,0]);
  assert.equal((await inspectImage(webp("VP8 ", lossy))).width,100);
  const lossless = new Uint8Array([47,99,64,12,0]);
  assert.deepEqual(await inspectImage(webp("VP8L", lossless)), {width:100,height:50,mime:"image/webp"});
});
test("rejects truncated metadata and bogus JPEG marker lengths", async () => {
  await assert.rejects(inspectImage(new Blob([new Uint8Array([255,216,255,224,255,255,0])])), /incomplete or corrupt/);
  const truncated = new Uint8Array(await png(100, 100).arrayBuffer());
  await assert.rejects(inspectImage(new Blob([truncated.slice(0, 28)])), /incomplete or corrupt/);
});
