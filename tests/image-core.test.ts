import test from "node:test";
import assert from "node:assert/strict";
import { cropRect, encodeToLimit, toPixels, validateSettings, fileChecks, type EditSettings } from "../src/lib/image-core.ts";

const valid: EditSettings = { width: 600, height: 800, maxBytes: 50_000, format: "image/jpeg", zoom: 1, x: 0, y: 0, rotation: 0 };

test("crop fills the target without distortion and pans to both edges", () => {
  assert.deepEqual(cropRect(1200, 800, 400, 400), { x: 200, y: 0, width: 800, height: 800 });
  assert.equal(cropRect(1200, 800, 400, 400, 1, -1, 0).x, 0);
  assert.equal(cropRect(1200, 800, 400, 400, 1, 1, 0).x, 400);
  const zoomed = cropRect(1200, 800, 400, 400, 2, 1, 1);
  assert.equal(zoomed.x + zoomed.width, 1200);
  assert.equal(zoomed.y + zoomed.height, 800);
});

test("portrait and signature crops remain inside source bounds", () => {
  for (const [w, h] of [[100, 900], [1600, 600], [300, 300]]) {
    for (const [tw, th] of [[350, 450], [140, 60]]) {
      const rect = cropRect(w, h, tw, th, 2.1, 0.7, -0.4);
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= w + 1e-6 && rect.y + rect.height <= h + 1e-6);
      assert.ok(Math.abs(rect.width / rect.height - tw / th) < 1e-8);
    }
  }
});

test("physical and percentage conversions use explicit resolution/source dimensions", () => {
  assert.equal(toPixels(2.54, "cm", 96, 400), 96);
  assert.equal(toPixels(2.54, "cm", 300, 400), 300);
  assert.equal(toPixels(50, "%", 96, 1200), 600);
});

test("invalid and unsafe export settings are rejected", () => {
  for (const override of [{ width: 0 }, { height: 4097 }, { width: 1.5 }, { maxBytes: NaN }, { maxBytes: 999 }, { rotation: 45 }, { zoom: 4 }, { x: -2 }, { format: "image/gif" }]) {
    assert.throws(() => validateSettings({ ...valid, ...override } as EditSettings));
  }
  assert.doesNotThrow(() => validateSettings(valid));
});

test("compression finds a valid output close to the limit with bounded attempts", async () => {
  let calls = 0;
  const result = await encodeToLimit(async (quality = 1) => { calls++; return new Blob([new Uint8Array(Math.round(quality * 100_000))]); }, "image/jpeg", 20_000);
  assert.equal(result.fits, true);
  assert.ok(result.blob.size <= 20_000 && result.blob.size > 19_500);
  assert.ok(calls <= 10);
});

test("impossible targets report failure rather than a false pass", async () => {
  const result = await encodeToLimit(async () => new Blob([new Uint8Array(60_000)]), "image/jpeg", 20_000);
  assert.equal(result.fits, false);
  assert.equal(result.blob.size, 60_000);
});

test("PNG exports once and checks actual size without a lossy-quality loop", async () => {
  let calls = 0;
  const result = await encodeToLimit(async () => { calls++; return new Blob([new Uint8Array(21_000)]); }, "image/png", 20_000);
  assert.equal(result.fits, false);
  assert.equal(calls, 1);
});

test("minimum sizes reject undersized files without adding padding", async () => {
  const result = await encodeToLimit(async () => new Blob([new Uint8Array(4000)]), "image/jpeg", 20_000, 10_000);
  assert.equal(result.fits, false);
  assert.equal(result.blob.size, 4000);
});

test("minimum and maximum are inclusive for PNG and lossy formats", async () => {
  for (const format of ["image/jpeg", "image/png", "image/webp"] as const) {
    for (const size of [10_000, 20_000]) {
      const result = await encodeToLimit(async () => new Blob([new Uint8Array(size)]), format, 20_000, 10_000);
      assert.equal(result.fits, true);
    }
  }
});

test("compression can find an output inside a bounded byte range", async () => {
  const result = await encodeToLimit(async (quality = 1) => new Blob([new Uint8Array(Math.round(quality * 100_000))]), "image/jpeg", 20_000, 19_000);
  assert.equal(result.fits, true);
  assert.ok(result.blob.size >= 19_000 && result.blob.size <= 20_000);
});

test("invalid ranges are rejected and actual file checks identify individual failures", () => {
  for (const minBytes of [-1, NaN, 50_001]) assert.throws(() => validateSettings({ ...valid, minBytes }));
  const requirements = { minBytes: 10_000, maxBytes: 20_000, width: 300, height: 100, format: "image/jpeg" };
  assert.deepEqual(fileChecks({ bytes: 10_000, width: 300, height: 100, mime: "image/jpeg" }, requirements), { size: true, dimensions: true, format: true });
  assert.deepEqual(fileChecks({ bytes: 9000, width: 900, height: 300, mime: "image/png" }, requirements), { size: false, dimensions: false, format: false });
});
