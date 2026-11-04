import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function addFile(page: Page, kind: "photo" | "signature", replacement = false) {
  const base64 = await page.evaluate(({ kind, replacement }) => {
    const canvas = document.createElement("canvas");
    canvas.width = kind === "photo" ? 900 : 1000;
    canvas.height = kind === "photo" ? 1200 : 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (kind === "photo") {
      ctx.fillStyle = replacement ? "#f3cfb5" : "#dae3f2"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#6f82a6"; ctx.beginPath(); ctx.arc(450, 370, 180, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(200, 600, 500, 600);
    } else {
      ctx.strokeStyle = "#18233c"; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(130, 215); ctx.bezierCurveTo(350, -60, 160, 250, 400, 130); ctx.bezierCurveTo(540, 20, 400, 280, 750, 150); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(240, 240); ctx.lineTo(800, 180); ctx.stroke();
    }
    return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  }, { kind, replacement });
  await page.locator(`#${kind}-editor input[type="file"]`).setInputFiles({ name: `${kind}-synthetic${replacement ? "-new" : ""}.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(base64, "base64") });
  await expect(page.locator(`#${kind}-editor`).getByRole("button", { name: "Rotate 90°" })).toBeVisible();
}

test("photo and signature keep independent settings and download separate validated files", async ({ page, context }, testInfo) => {
  const requests: { url: string; method: string }[] = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  await page.goto("/");
  await page.getByRole("button", { name: /^Violet/ }).click();
  const photo = page.locator("#photo-editor"), signature = page.locator("#signature-editor");
  await addFile(page, "photo");
  await photo.getByRole("button", { name: "Resize & compress" }).click();
  await expect(photo.getByRole("link", { name: "Download photo" })).toBeVisible();
  const photoUrl = await photo.getByRole("link", { name: "Download photo" }).getAttribute("href");
  await page.getByRole("button", { name: "Continue to signature" }).click();
  await expect(page.getByRole("tab", { name: /^02 Signature/ })).toHaveAttribute("aria-selected", "true");
  await expect(signature.getByLabel("Custom", { exact: true })).toHaveValue("20");
  await addFile(page, "signature");
  await signature.getByLabel("Custom", { exact: true }).fill("10");
  await signature.getByLabel(/^Width/).fill("300");
  await signature.getByRole("button", { name: "Resize & compress" }).click();
  await expect(signature.getByRole("link", { name: "Download signature" })).toBeVisible();
  const signatureUrl = await signature.getByRole("link", { name: "Download signature" }).getAttribute("href");
  await page.getByRole("button", { name: "Review both files" }).click();
  const review = page.getByRole("tabpanel", { name: /Review & download/ });
  await expect(review.getByText("2/2 files ready", { exact: true })).toBeVisible();
  await expect(review.getByRole("img", { name: "Prepared photo" })).toHaveJSProperty("naturalWidth", 600);
  await expect(review.getByRole("img", { name: "Prepared signature" })).toHaveJSProperty("naturalWidth", 300);
  await expect(review.getByRole("img", { name: "Prepared signature" })).toHaveJSProperty("naturalHeight", 90);
  for (const [kind, limit] of [["photo", 50_000], ["signature", 10_000]] as const) {
    const event = page.waitForEvent("download");
    await review.getByRole("link", { name: `Download ${kind}` }).click();
    const download = await event;
    expect(download.suggestedFilename()).toContain(`photoresizekaro-${kind}-`);
    const file = testInfo.outputPath(`${kind}.jpg`); await download.saveAs(file);
    const bytes = await readFile(file); expect(bytes.length).toBeLessThanOrEqual(limit);
    expect(bytes[0]).toBe(255); expect(bytes[1]).toBe(216);
  }
  await page.screenshot({ path: testInfo.outputPath("paired-review.png"), fullPage: true });
  await review.getByRole("button", { name: "Edit photo", exact: true }).click();
  await expect(photo.getByRole("link", { name: "Download photo" })).toHaveAttribute("href", photoUrl!);
  await expect(photo.getByLabel("Custom", { exact: true })).toHaveValue("50");
  await photo.getByRole("button", { name: "20 KB", exact: true }).click();
  await expect(photo.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Review & download/ }).click();
  await expect(review.getByText("1/2 files ready", { exact: true })).toBeVisible();
  await expect(review.getByRole("link", { name: "Download signature" })).toHaveAttribute("href", signatureUrl!);
  await expect(review.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  await review.getByRole("button", { name: "Edit signature", exact: true }).click();
  await expect(signature.getByLabel(/^Width/)).toHaveValue("300");
  await expect(signature.getByLabel("Custom", { exact: true })).toHaveValue("10");
  await context.setOffline(true);
  await signature.getByRole("button", { name: "Resize & compress" }).click();
  await expect(signature.getByRole("link", { name: "Download signature" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  expect(requests.filter((request) => request.method !== "GET")).toEqual([]);
  expect(requests.filter((request) => !request.url.startsWith(new URL(page.url()).origin + "/") && !request.url.startsWith("blob:"))).toEqual([]);
});

test("replacing or clearing one file preserves the other; clearing the session releases both results", async ({ page }) => {
  await page.goto("/");
  await addFile(page, "photo"); await page.locator("#photo-editor").getByRole("button", { name: "Resize & compress" }).click();
  await expect(page.getByRole("link", { name: "Download photo" })).toBeVisible();
  const photoUrl = await page.getByRole("link", { name: "Download photo" }).getAttribute("href");
  await page.getByRole("button", { name: "Continue to signature" }).click();
  await addFile(page, "signature"); await page.locator("#signature-editor").getByRole("button", { name: "Resize & compress" }).click();
  await expect(page.getByRole("link", { name: "Download signature" })).toBeVisible();
  const signatureUrl = await page.getByRole("link", { name: "Download signature" }).getAttribute("href");
  await page.getByRole("tab", { name: /Photo Ready/ }).click();
  await addFile(page, "photo", true);
  await page.getByRole("tab", { name: /Review & download/ }).click();
  const review = page.getByRole("tabpanel", { name: /Review & download/ });
  await expect(review.getByRole("link", { name: "Download signature" })).toHaveAttribute("href", signatureUrl!);
  await expect(review.getByRole("link", { name: "Download photo" })).toHaveCount(0);
  expect(await page.evaluate((url) => new Promise<boolean>((resolve) => { const image = new Image(); image.onload = () => resolve(false); image.onerror = () => resolve(true); image.src = url!; }), photoUrl)).toBe(true);
  await review.getByRole("button", { name: "Edit photo", exact: true }).click();
  await page.getByRole("button", { name: "Clear photo", exact: true }).click();
  await page.getByRole("button", { name: "Clear both files", exact: true }).click();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByRole("tab", { name: /Review & download/ }).click();
  await expect(review.getByRole("link", { name: "Download signature" })).toBeVisible();
  await page.getByRole("button", { name: "Clear both files", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Clear both files", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Drop your photo here" })).toBeVisible();
  await page.getByRole("tab", { name: /Review & download/ }).click();
  await expect(review.getByText("0/2 files ready", { exact: true })).toBeVisible();
  await expect(review.getByRole("link")).toHaveCount(0);
  expect(await page.evaluate((url) => new Promise<boolean>((resolve) => { const image = new Image(); image.onload = () => resolve(false); image.onerror = () => resolve(true); image.src = url!; }), signatureUrl)).toBe(true);
});

test("mobile Hindi workflow, empty review and keyboard navigation remain usable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  const first = page.getByRole("tab", { name: /^01 Photo/ }); await first.focus(); await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Review & download/ })).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: /Review & download/ }).getByRole("link")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: /^02 Signature/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Switch to Hindi" }).click();
  await expect(page.getByRole("heading", { name: "अपने हस्ताक्षर तैयार करें" })).toBeVisible();
  await expect(page.locator("#signature-editor button.choose-button")).toHaveText("हस्ताक्षर चुनें");
  await page.getByRole("button", { name: "दोनों फ़ाइलें जाँचें" }).click();
  await expect(page.getByRole("heading", { name: "अपनी फ़ाइलें जाँचें" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-hindi-workflow.png"), fullPage: true });
});
