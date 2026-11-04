import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("original-file checker and min/max requirements use actual bytes and invalidate stale downloads", async ({ page }) => {
  await page.goto("/");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(900, 600); let seed = 47;
    for (let i = 0; i < image.data.length; i += 4) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; image.data[i] = seed & 255; image.data[i + 1] = seed >>> 8 & 255; image.data[i + 2] = seed >>> 16 & 255; image.data[i + 3] = 255; }
    ctx.putImageData(image, 0, 0); return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('#photo-editor input[type="file"]').setInputFiles({ name: "range-check.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") });
  const editor = page.locator("#photo-editor");
  await editor.getByLabel(/^Width/).fill("300");
  await editor.getByLabel("Custom", { exact: true }).fill("20");
  await editor.getByLabel("Minimum (optional)", { exact: true }).fill("10");
  await editor.locator(".original-checker summary").click();
  await expect(editor.locator('.original-checker li[data-passed="false"]')).toHaveCount(3);
  await editor.getByRole("button", { name: "Resize & compress" }).click();
  await expect(editor.getByRole("heading", { name: "Ready to download" })).toBeVisible();
  await expect(editor.locator('.result-panel li[data-passed="true"]')).toHaveCount(3);
  const downloadEvent = page.waitForEvent("download");
  await editor.getByRole("link", { name: "Download photo" }).click();
  const download = await downloadEvent;
  const size = (await readFile((await download.path())!)).length;
  expect(size).toBeGreaterThanOrEqual(10_000); expect(size).toBeLessThanOrEqual(20_000);
  await editor.getByLabel("Minimum (optional)", { exact: true }).fill("25");
  await expect(editor.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await editor.getByRole("button", { name: "Resize & compress" }).click();
  await expect(editor.locator(".error-message")).toContainText("Minimum file size");
});

test("undersized results fail the lower bound and stay out of the paired review", async ({ page }) => {
  await page.goto("/");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 600;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "white"; ctx.fillRect(0, 0, 600, 600);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await page.locator('#photo-editor input[type="file"]').setInputFiles({ name: "plain.jpg", mimeType: "image/jpeg", buffer: Buffer.from(base64, "base64") });
  const editor = page.locator("#photo-editor");
  await editor.getByLabel("Minimum (optional)", { exact: true }).fill("10");
  await editor.getByRole("button", { name: "Resize & compress" }).click();
  await expect(editor.getByText(/below your minimum size/)).toBeVisible();
  await expect(editor.locator('.result-panel li[data-passed="false"]')).toHaveCount(1);
  await expect(editor.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Review & download/ }).click();
  await expect(page.getByRole("tabpanel", { name: /Review & download/ }).getByRole("link")).toHaveCount(0);
});

test("Trust page opens separately, works on mobile, and explains the actual data boundary in Hindi", async ({ page }, testInfo) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Read the Trust page (opens a new tab)" }).first();
  await expect(link).toHaveAttribute("target", "_blank");
  const popupEvent = page.waitForEvent("popup"); await link.click(); const trust = await popupEvent;
  await expect(trust.getByRole("heading", { name: "Your photos belong on your device." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One form. Two files. All set." })).toBeVisible();
  await trust.setViewportSize({ width: 390, height: 844 });
  await trust.getByRole("button", { name: "Switch to Hindi" }).click();
  await expect(trust.getByRole("heading", { name: "आपकी फ़ोटो आपके डिवाइस पर रहे।" })).toBeVisible();
  expect(await trust.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await trust.screenshot({ path: testInfo.outputPath("trust-hindi-mobile.png"), fullPage: true });
  await trust.close();
});
