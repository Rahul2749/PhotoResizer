import { test, expect } from "@playwright/test";

test("photo and signature file choices are visible without scrolling on phones and desktop", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("#photo-editor .dropzone").getByRole("button", { name: "Choose a photo", exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.locator(".preset-disclosure")).not.toHaveAttribute("open", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator("#workflow-tab-signature").click();
    await expect(page.locator("#signature-editor .dropzone").getByRole("button", { name: "Choose a signature", exact: true })).toBeInViewport({ ratio: 1 });
    if (viewport.width === 390) await page.screenshot({ path: testInfo.outputPath("signature-first-screen.png") });
  }
});

test("search content, metadata and structured data exist before JavaScript runs", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveTitle("Photo & Signature Resizer — Free Online | PhotoResizeKaro");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Photo & signature resizer");
    await expect(page.getByRole("heading", { name: "How to resize a photo or signature online" })).toBeVisible();
    await page.getByText("Can I resize a photo to exactly 20 KB?", { exact: true }).click();
    await expect(page.locator(".tool-faq details[open]")).toContainText("without adding padding");
    const schema = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    const app = schema["@graph"].find((node: Record<string, unknown>) => node["@type"] === "WebApplication");
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.offers.price).toBe(0);
    expect(app.aggregateRating).toBeUndefined();
    for (const route of ["/", "/trust", "/privacy", "/terms", "/contact"]) {
      await page.goto(route);
      const url = `https://photoresizekaro.in${route === "/" ? "" : route}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", url);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", await page.title());
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://photoresizekaro.in/social-card.png");
    }
    const image = await context.request.get("/social-card.png");
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  } finally { await context.close(); }
});
