import { test, expect } from "@playwright/test";

test("production pages hydrate under the hashed CSP and block injected scripts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Violet/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  const blocked = await page.evaluate(() => new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.textContent = "window.__unapprovedScriptRan = true";
    document.body.append(script);
    setTimeout(() => resolve(!(window as unknown as Record<string, unknown>).__unapprovedScriptRan), 100);
  }));
  expect(blocked).toBe(true);
  for (const route of ["/privacy", "/terms", "/contact"]) {
    await page.goto(route);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://photoresizekaro.in${route}`);
    await expect(page.getByRole("link", { name: "support@photoresizekaro.in", exact: true }).first()).toHaveAttribute("href", "mailto:support@photoresizekaro.in");
  }
  await page.goto("/not-a-real-route");
  await expect(page.getByRole("heading", { name: "This page isn’t here." })).toBeVisible();
});

test("oversized decoded image declarations are rejected before bitmap allocation", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.createImageBitmap;
    (window as unknown as Record<string, unknown>).__bitmapCalls = 0;
    window.createImageBitmap = ((...args: Parameters<typeof createImageBitmap>) => {
      (window as unknown as Record<string, number>).__bitmapCalls++;
      return (original as (...values: unknown[]) => Promise<ImageBitmap>)(...args);
    }) as typeof createImageBitmap;
  });
  await page.goto("/");
  const header = Buffer.alloc(45);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(header);
  header.writeUInt32BE(13, 8); header.write("IHDR", 12); header.writeUInt32BE(8000, 16); header.writeUInt32BE(6000, 20); header.write("IDAT", 37);
  await page.locator('#photo-editor input[type="file"]').setInputFiles({ name: "large-declaration.png", mimeType: "image/png", buffer: header });
  await expect(page.locator(".error-message")).toContainText("24 megapixels");
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__bitmapCalls)).toBe(0);
});

test("direct crop/rotation preserves quadrant positions in worker and compatibility paths", async ({ page }) => {
  for (const fallback of [false, true]) {
    await page.goto("/");
    if (fallback) await page.evaluate(() => { Object.defineProperty(window, "OffscreenCanvas", { value: undefined, configurable: true }); });
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 120; canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      for (const [color, x, y] of [["#ff0000",0,0],["#00ff00",60,0],["#0000ff",0,40],["#ffff00",60,40]] as const) { ctx.fillStyle = color; ctx.fillRect(x,y,60,40); }
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const editor = page.locator("#photo-editor");
    await editor.locator('input[type="file"]').setInputFiles({ name:"quadrants.png", mimeType:"image/png", buffer:Buffer.from(base64,"base64") });
    await editor.getByLabel("Output format",{exact:true}).selectOption("image/png");
    await editor.getByRole("button",{name:"Rotate 90°"}).click();
    await editor.getByRole("button",{name:"Resize & compress"}).click();
    const image = editor.locator(".preview-stage img");
    await expect(image).toHaveJSProperty("naturalWidth",80);
    await expect(image).toHaveJSProperty("naturalHeight",120);
    const pixel = await image.evaluate((element) => {
      const canvas = document.createElement("canvas"); canvas.width=80; canvas.height=120;
      const ctx=canvas.getContext("2d")!;ctx.drawImage(element as HTMLImageElement,0,0);
      return Array.from(ctx.getImageData(10,10,1,1).data);
    });
    expect(pixel).toEqual([0,0,255,255]);
  }
});
