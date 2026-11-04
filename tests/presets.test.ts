import test from "node:test";
import assert from "node:assert/strict";
import { examPresets, presetIsStale } from "../src/lib/presets.ts";
import { withJpegDpi } from "../src/lib/jpeg-dpi.ts";
import { validateSettings, type EditSettings } from "../src/lib/image-core.ts";

test("preset records have unique identities, scoped sources and bounded ranges", () => {
  assert.equal(examPresets.length, 8);
  assert.equal(new Set(examPresets.map((entry) => entry.id)).size, 8);
  for (const preset of examPresets) {
    const host = new URL(preset.source).hostname;
    assert.ok(["cdnbbsr.s3waas.gov.in", "www.ibps.in", "sbi.bank.in", "ssc.gov.in"].includes(host));
    assert.ok(preset.checked < preset.reviewBy);
    assert.equal(presetIsStale(preset, "2026-10-25"), false);
    assert.equal(presetIsStale(preset, "2026-12-01"), true);
    for (const rule of [preset.photo, preset.signature]) if (rule) {
      assert.ok(rule.minKB > 0 && rule.minKB <= rule.maxKB);
      assert.equal(rule.format, "image/jpeg");
      assert.ok(Boolean(rule.width) === Boolean(rule.height));
    }
  }
});

test("SSC never prescribes an uploaded photo or guesses conflicting dimensions", () => {
  const ssc = examPresets.find((preset) => preset.id === "ssc-cgl-2026")!;
  assert.equal(ssc.photo, null); assert.equal(ssc.livePhoto, "only");
  assert.equal(ssc.signature.minKB, 10); assert.equal(ssc.signature.maxKB, 20);
  assert.equal(ssc.signature.dimensionKind, "conflict");
  assert.equal(ssc.signature.width, undefined);
});

test("CTET pixel dimensions are explicitly derived, SBI sizes preferred, IBPS calendar dimensions unspecified", () => {
  const ctet = examPresets.find((preset) => preset.id === "ctet-sept-2026")!;
  assert.equal(ctet.photo!.width, Math.round(3.5 / 2.54 * 300));
  assert.equal(ctet.photo!.height, Math.round(4.5 / 2.54 * 300));
  assert.equal(ctet.signature.height, Math.round(1.5 / 2.54 * 300));
  assert.equal(ctet.signature.dpi, 300); assert.equal(ctet.photo!.dimensionKind, "derived");
  const sbi = examPresets.find((preset) => preset.id === "sbi-general-guide")!;
  assert.equal(sbi.scope, "general"); assert.equal(sbi.photo!.dimensionKind, "preferred");
  const ibps = examPresets.find((preset) => preset.id === "ibps-2026-guide")!;
  assert.equal(ibps.scope, "general"); assert.equal(ibps.photo!.width, undefined);
});

test("JFIF density patch preserves payload and updates both density axes", async () => {
  const bytes = new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1,1,1,0,96,0,96,0,0,255,218,8,9,10,255,217]);
  const output = new Uint8Array(await (await withJpegDpi(new Blob([bytes], { type: "image/jpeg" }), 300)).arrayBuffer());
  assert.equal(output.length, bytes.length); assert.equal(output[13], 1);
  assert.equal(output[14] * 256 + output[15], 300); assert.equal(output[16] * 256 + output[17], 300);
  assert.deepEqual(output.slice(18), bytes.slice(18));
  assert.equal(bytes[14] * 256 + bytes[15], 96);
});

test("JPEGs without JFIF get a valid density segment before the existing data", async () => {
  const bytes = new Uint8Array([255,216,255,218,8,9,255,217]);
  const output = new Uint8Array(await (await withJpegDpi(new Blob([bytes], { type: "image/jpeg" }), 200)).arrayBuffer());
  assert.equal(output.length, bytes.length + 18);
  assert.equal(output[13], 1); assert.equal(output[14] * 256 + output[15], 200);
  assert.deepEqual(output.slice(20), bytes.slice(2));
});

test("DPI limits reject invalid settings and non-JPEG exports are unchanged", async () => {
  const base: EditSettings = { width: 100, height: 100, format: "image/jpeg", maxBytes: 20_000, rotation: 0, zoom: 1, x: 0, y: 0 };
  for (const dpi of [0, NaN, 1201, 96.5]) assert.throws(() => validateSettings({ ...base, dpi }));
  const png = new Blob(["test"], { type: "image/png" });
  assert.equal(await withJpegDpi(png, 300), png);
});
