import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { toolIndex } from "../../src/lib/tool-index";

async function photo(page: Page) {
  const image = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 800; const ctx = canvas.getContext("2d")!; const gradient = ctx.createLinearGradient(0, 0, 900, 800); gradient.addColorStop(0, "#ccddff"); gradient.addColorStop(1, "#31569a"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 900, 800); return canvas.toDataURL("image/jpeg").split(",")[1]; });
  await page.locator('#photo-editor input[type="file"]').setInputFiles({ name: "synthetic-photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from(image, "base64") });
}
test("all focused tools have static search content, unique metadata and matching canonical URLs", async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const titles = new Set<string>();
  try {
    const page = await context.newPage();
    for (const tool of toolIndex) {
      await page.goto(`/${tool.slug}`); await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://photoresizekaro.in/${tool.slug}`);
      const title = await page.title(); expect(titles.has(title)).toBe(false); titles.add(title);
      await expect(page.getByRole("heading", { name: "Starting settings you can change" })).toBeVisible();
      const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!); expect(data["@graph"].find((item: Record<string, unknown>) => item["@type"] === "BreadcrumbList").itemListElement).toHaveLength(3);
    }
    const sitemap = await (await request.get("/sitemap.xml")).text(); for (const tool of toolIndex) expect(sitemap).toContain(`https://photoresizekaro.in/${tool.slug}`);
    expect(sitemap).not.toMatch(/admin-photoresize|payment-status|purchases/);
  } finally { await context.close(); }
});
test("KB pages really select their advertised limit and generate a checked small image", async ({ page }) => {
  for (const size of [20, 50, 100, 200]) {
    await page.goto(`/resize-image-to-${size}kb`); await expect(page.locator("#photo-size-limit")).toHaveValue(String(size)); await expect(page.locator("#workflow-tab-photo")).toHaveAttribute("aria-selected", "true");
  }
  await page.goto("/resize-image-to-20kb"); await photo(page); const editor = page.locator("#photo-editor"); await editor.getByRole("button", { name: "Resize & compress", exact: true }).click();
  const event = page.waitForEvent("download"); await editor.getByRole("link", { name: "Download photo", exact: true }).click(); const image = await readFile((await(await event).path())!); expect(image.length).toBeLessThanOrEqual(20000); expect(image[0]).toBe(255); expect(image[1]).toBe(216);
});
test("signature tool opens the signature tab with the editable 10–20 KB range", async ({ page }) => {
  await page.goto("/signature-resizer"); await expect(page.locator("#workflow-tab-signature")).toHaveAttribute("aria-selected", "true"); await expect(page.locator("#signature-size-limit")).toHaveValue("20"); await expect(page.locator("#signature-minimum")).toHaveValue("10");
  await expect(page.locator("#signature-editor .dropzone").getByRole("button", { name: "Choose a signature", exact: true })).toBeVisible();
});
test("pixel and print-size tools preserve their promised dimensions and JPEG density", async ({ page }) => {
  for (const [route, width, height, dpi] of [["/resize-image-to-200x230", 200, 230, 96], ["/passport-photo-resizer", 413, 531, 300]] as const) {
    await page.goto(route); const editor = page.locator("#photo-editor"); await photo(page); await editor.getByRole("button", { name: "Resize & compress", exact: true }).click();
    await expect(editor.locator(".preview-stage img")).toHaveJSProperty("naturalWidth", width); await expect(editor.locator(".preview-stage img")).toHaveJSProperty("naturalHeight", height);
    const download = page.waitForEvent("download"); await editor.getByRole("link", { name: "Download photo", exact: true }).click(); const bytes = await readFile((await(await download).path())!); const jfif = bytes.indexOf(Buffer.from("JFIF\0")); expect(jfif).toBeGreaterThanOrEqual(0); expect(bytes[jfif + 7]).toBe(1); expect(bytes.readUInt16BE(jfif + 8)).toBe(dpi); expect(bytes.readUInt16BE(jfif + 10)).toBe(dpi);
  }
});
test("focused tools put the chosen file control on the first phone screen", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
  await page.setViewportSize(viewport);
  for (const route of ["/resize-image-to-20kb", "/signature-resizer", "/passport-photo-resizer"]) {
    await page.goto(route); const kind = route === "/signature-resizer" ? "signature" : "photo";
    await expect(page.locator(`#${kind}-editor .dropzone`).getByRole("button", { name: `Choose a ${kind}`, exact: true }),`${route} at ${viewport.width}×${viewport.height}`).toBeInViewport({ ratio: 1 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (route === "/resize-image-to-20kb" && viewport.width === 390) await page.screenshot({ path: testInfo.outputPath("20kb-tool-phone.png") });
  }
  }
});
test("tools and rejection guide expose real internal navigation and useful checks", async ({ page }) => {
  await page.goto("/tools"); await page.getByRole("link", { name: /Signature resizer Start/ }).click(); await expect(page).toHaveURL(/\/signature-resizer$/);
  await page.goto("/guides/photo-upload-rejected"); await expect(page.getByRole("heading", { name: "3. Verify the actual image format" })).toBeVisible(); await expect(page.getByRole("link", { name: "the signature tool", exact: true })).toHaveAttribute("href", "/signature-resizer");
});
