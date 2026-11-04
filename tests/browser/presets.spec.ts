import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function addTexture(page: Page, kind: "photo" | "signature") {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 1000;
    const ctx = canvas.getContext("2d")!, image = ctx.createImageData(800, 1000); let seed = 77;
    for (let i = 0; i < image.data.length; i += 4) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; image.data[i] = seed & 255; image.data[i+1] = seed >>> 8 & 255; image.data[i+2] = seed >>> 16 & 255; image.data[i+3] = 255; }
    ctx.putImageData(image, 0, 0); return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await page.locator(`#${kind}-editor input[type="file"]`).setInputFiles({ name: `${kind}-texture.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(base64,"base64") });
  await expect(page.locator(`#${kind}-editor`).getByRole("button", { name: "Rotate 90°" })).toBeVisible();
}

async function apply(page: Page, value: string) {
  if (!(await page.locator(".preset-disclosure").evaluate((element) => (element as HTMLDetailsElement).open))) await page.locator(".preset-disclosure > summary").click();
  await page.getByLabel("Exam or application", { exact: true }).selectOption(value);
  await page.getByRole("button", { name: "Apply preset", exact: true }).click();
}

test("choosing a preset is explicit; applying keeps files, updates both limits and clears old results", async ({ page }) => {
  await page.goto("/"); await addTexture(page, "photo");
  const photo = page.locator("#photo-editor");
  await photo.getByRole("button", { name: "Resize & compress" }).click();
  await expect(photo.getByRole("link", { name: "Download photo" })).toBeVisible();
  await page.locator(".preset-disclosure > summary").click();
  await page.getByLabel("Exam or application", { exact: true }).selectOption("cuet-ug-2026");
  await expect(photo.getByLabel("Custom", { exact: true })).toHaveValue("50");
  await expect(photo.getByRole("link", { name: "Download photo" })).toBeVisible();
  await page.getByRole("button", { name: "Apply preset", exact: true }).click();
  await expect(photo.getByLabel("Custom", { exact: true })).toHaveValue("200");
  await expect(photo.getByLabel("Minimum (optional)", { exact: true })).toHaveValue("10");
  await expect(photo.getByRole("button", { name: "Rotate 90°" })).toBeVisible();
  await expect(photo.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await expect(page.locator(".preset-live-note")).toContainText("Live photo also required");
  await page.getByRole("button", { name: "Continue to signature" }).click();
  await expect(page.locator("#signature-editor").getByLabel("Custom", { exact: true })).toHaveValue("50");
  await expect(page.locator("#signature-editor").getByLabel("Minimum (optional)", { exact: true })).toHaveValue("10");
  await expect(page.getByRole("link", { name: "Official source" })).toHaveAttribute("href", /cdnbbsr\.s3waas\.gov\.in/);
});

test("CTET exports real JPEG resolution metadata with the derived centimetre dimensions", async ({ page }, testInfo) => {
  await page.goto("/"); await apply(page, "ctet-sept-2026"); await addTexture(page, "photo");
  const photo = page.locator("#photo-editor");
  await expect(photo.getByLabel(/^Width/)).toHaveValue("413");
  await expect(photo.getByLabel(/^Height/)).toHaveValue("531");
  await expect(photo.getByLabel("JPEG resolution (DPI)", { exact: true })).toHaveValue("300");
  await photo.getByRole("button", { name: "Resize & compress" }).click();
  await expect(photo.getByRole("link", { name: "Download photo" })).toBeVisible();
  const event = page.waitForEvent("download"); await photo.getByRole("link", { name: "Download photo" }).click();
  const data = await readFile((await (await event).path())!);
  expect(data.length).toBeGreaterThanOrEqual(10_000); expect(data.length).toBeLessThanOrEqual(100_000);
  const jfif = data.indexOf(Buffer.from("JFIF\0")); expect(jfif).toBeGreaterThan(0);
  expect(data[jfif + 7]).toBe(1); expect(data.readUInt16BE(jfif + 8)).toBe(300); expect(data.readUInt16BE(jfif + 10)).toBe(300);
  await expect(photo.locator(".preview-stage img")).toHaveJSProperty("naturalWidth",413);
  await expect(photo.locator(".preview-stage img")).toHaveJSProperty("naturalHeight",531);
  await page.screenshot({path:testInfo.outputPath("ctet-preset.png"),fullPage:true});
});

test("SSC has live capture guidance, a dimension-conflict warning and a signature-only review", async ({ page }) => {
  await page.goto("/"); await apply(page,"ssc-cgl-2026");
  await expect(page.locator("#signature-editor")).toBeVisible();
  await expect(page.locator(".preset-details")).toContainText("Source conflict");
  await expect(page.locator("#signature-editor").getByLabel(/^Width/)).toHaveValue("600");
  await page.getByRole("tab",{name:/Photo Capture on portal/}).click();
  await expect(page.getByRole("heading",{name:"Take your photo on the official portal"})).toBeVisible();
  await expect(page.locator("#photo-editor")).not.toBeVisible();
  await page.getByRole("tab",{name:/Review & download/}).click();
  const review=page.getByRole("tabpanel",{name:/Review & download/});
  await expect(review.getByText("0/1 files ready",{exact:true})).toBeVisible();
  await expect(review.getByRole("article",{name:"Photo",exact:true})).toHaveCount(0);
  await expect(review.getByRole("article",{name:"Signature",exact:true})).toBeVisible();
});

test("SBI preferred sizes and IBPS general scope are distinguished; custom mode restores both-file workflow", async ({ page }) => {
  await page.goto("/"); await apply(page,"sbi-general-guide");
  await expect(page.locator("#photo-editor").getByLabel(/^Width/)).toHaveValue("200");
  await expect(page.locator(".preset-details")).toContainText("preferred");
  await expect(page.locator(".preset-source-heading")).toContainText("General guide");
  await apply(page,"ibps-2026-guide");
  await expect(page.locator(".preset-details")).toContainText("calendar does not give pixel dimensions");
  await expect(page.locator("#photo-editor").getByLabel(/^Width/)).toHaveValue("200");
  await apply(page,"ssc-cgl-2026");
  await page.getByLabel("Exam or application",{exact:true}).selectOption("");
  await page.getByRole("button",{name:"Use custom settings",exact:true}).click();
  await page.getByRole("tab",{name:/Review & download/}).click();
  await expect(page.getByRole("tabpanel",{name:/Review & download/}).getByText("0/2 files ready",{exact:true})).toBeVisible();
});

test("preset details work in Hindi on a phone viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({width:390,height:844}); await page.goto("/");
  await page.getByRole("button",{name:"Switch to Hindi"}).click();
  await page.locator(".preset-disclosure > summary").click();
  await page.getByLabel("परीक्षा या आवेदन",{exact:true}).selectOption("ctet-sept-2026");
  await page.getByRole("button",{name:"प्रीसेट लागू करें",exact:true}).click();
  await expect(page.locator(".preset-details")).toContainText("300 DPI");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("presets-mobile-hindi.png"),fullPage:true});
});
