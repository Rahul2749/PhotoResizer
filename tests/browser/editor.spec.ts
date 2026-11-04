import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function fixture(page: Page, format = "image/jpeg") {
  const base64 = await page.evaluate((type) => {
    const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 900;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.createImageData(1200, 900);
    let seed = 42;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data.data[i] = seed & 255; data.data[i + 1] = (seed >>> 8) & 255; data.data[i + 2] = (seed >>> 16) & 255; data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    ctx.fillStyle = "white"; ctx.fillRect(240, 300, 720, 200);
    ctx.fillStyle = "#245b41"; ctx.font = "bold 70px Arial"; ctx.fillText("TEST PHOTO", 340, 420);
    return canvas.toDataURL(type, 0.9).split(",")[1];
  }, format);
  await page.locator('#photo-editor input[type="file"]').setInputFiles({ name: "synthetic-test-photo.jpg", mimeType: format, buffer: Buffer.from(base64, "base64") });
  await expect(page.getByRole("button", { name: "Rotate 90°" })).toBeVisible();
}

test("validates a real export, invalidates edits, rotates, processes offline and clears", async ({ page, context }, testInfo) => {
  const requests: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ready for the form.");
  await page.screenshot({ path: testInfo.outputPath("desktop-empty.png"), fullPage: true });
  await fixture(page);
  await page.getByRole("button", { name: "20 KB", exact: true }).click();
  await page.getByRole("button", { name: "Resize & compress" }).click();
  await expect(page.getByRole("heading", { name: "Ready to download" })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download photo" }).click();
  const download = await downloadEvent;
  const downloadPath = testInfo.outputPath("export.jpg"); await download.saveAs(downloadPath);
  const data = await readFile(downloadPath);
  expect(data.length).toBeLessThanOrEqual(20_000);
  expect(data[0]).toBe(255); expect(data[1]).toBe(216);
  expect(data.includes(Buffer.from("Exif\0\0"))).toBe(false);
  await expect(page.locator(".preview-stage img")).toHaveJSProperty("naturalWidth", 600);
  await expect(page.locator(".preview-stage img")).toHaveJSProperty("naturalHeight", 450);
  await page.screenshot({ path: testInfo.outputPath("desktop-result.png"), fullPage: true });
  await page.getByRole("button", { name: "Rotate 90°" }).click();
  await expect(page.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Resize & compress" }).click();
  await expect(page.getByRole("heading", { name: "Ready to download" })).toBeVisible();
  await expect(page.locator(".preview-stage img")).toHaveJSProperty("naturalWidth", 450);
  await expect(page.locator(".preview-stage img")).toHaveJSProperty("naturalHeight", 600);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Clear photo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Drop your photo here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  expect(requests.filter((request) => !request.url.startsWith(new URL(page.url()).origin + "/") && !request.url.startsWith("blob:"))).toEqual([]);
  expect(requests.filter((request) => request.method !== "GET")).toEqual([]);
  expect(requests.some((request) => request.url.includes("synthetic-test-photo"))).toBe(false);
  expect(errors).toEqual([]);
});

test("impossible PNG limits fail honestly, dimensions convert and corrupt files are rejected", async ({ page }) => {
  await page.goto("/"); await fixture(page);
  await page.locator("#photo-editor").getByLabel("Output format", { exact: true }).selectOption("image/png");
  await page.locator("#photo-editor").getByLabel("Custom", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Resize & compress" }).click();
  await expect(page.getByRole("heading", { name: "This size limit needs an adjustment" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await page.locator("#photo-editor").getByLabel("Output format", { exact: true }).selectOption("image/jpeg");
  await page.getByRole("button", { name: "50 KB", exact: true }).click();
  await page.locator("#photo-editor").getByLabel("Unit", { exact: true }).selectOption("cm");
  await page.locator("#photo-editor").getByLabel(/^Width/).fill("2.54");
  await page.getByRole("button", { name: "Resize & compress" }).click();
  await expect(page.getByRole("heading", { name: "Ready to download" })).toBeVisible();
  await expect(page.locator(".preview-stage img")).toHaveJSProperty("naturalWidth", 96);
  await page.locator('#photo-editor input[type="file"]').setInputFiles({ name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not a JPEG") });
  await expect(page.locator(".error-message")).toContainText("Choose JPG, PNG or WebP");
  await expect(page.getByRole("link", { name: "Download photo" })).toHaveCount(0);
});

test("mobile layout, Hindi and privacy explanation work", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "How local processing works" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it", exact: true }).last().click();
  await fixture(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-loaded.png"), fullPage: true });
  await page.getByRole("button", { name: "Switch to Hindi" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("button", { name: "रीसाइज़ और कंप्रेस करें" })).toBeVisible();
  await page.getByRole("button", { name: "रीसाइज़ और कंप्रेस करें" }).click();
  await expect(page.getByRole("heading", { name: "डाउनलोड के लिए तैयार" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-hindi-result.png"), fullPage: true });
});
