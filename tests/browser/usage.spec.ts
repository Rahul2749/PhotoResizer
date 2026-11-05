import { test, expect } from "@playwright/test";

test("anonymous counts contain only allowlisted counters and can be turned off", async ({ page }) => {
  const events: Record<string, unknown>[] = [];
  await page.route("**/api/usage/config", (route) => route.fulfill({ json: { enabled: true } }));
  await page.route("**/api/usage", (route) => { events.push(route.request().postDataJSON()); return route.fulfill({ json: { recorded: true } }); });
  await page.goto("/"); await expect.poll(() => events.filter((event) => event.event === "page_view").length).toBe(1);
  const image = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 1000; const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#ccddee"; ctx.fillRect(0, 0, 800, 1000); return canvas.toDataURL("image/jpeg").split(",")[1]; });
  const editor = page.locator("#photo-editor"); await editor.locator('input[type="file"]').setInputFiles({ name: "private-identity.jpg", mimeType: "image/jpeg", buffer: Buffer.from(image, "base64") });
  await editor.getByRole("slider", { name: "Zoom", exact: true }).focus(); await page.keyboard.press("ArrowRight"); await editor.getByRole("button", { name: "Resize & compress", exact: true }).click(); await expect.poll(() => events.some((event) => event.event === "image_processed")).toBe(true); await expect.poll(() => events.some((event) => event.event === "crop_completed")).toBe(true);
  for (const event of events) expect(Object.keys(event).sort()).toEqual(["dimensionBucket", "event", "eventId", "preset", "sizeBucket", "tool", "visitId"]);
  expect(JSON.stringify(events)).not.toContain("private-identity"); expect(JSON.stringify(events)).not.toContain("data:image");
  await page.getByRole("button", { name: "Anonymous usage counts: on — turn off", exact: true }).click(); await expect(page.getByRole("button", { name: "Anonymous usage counts: off — turn on", exact: true })).toBeVisible();
  const before = events.length; await editor.getByRole("button", { name: "Resize & compress", exact: true }).click(); await expect(editor.getByRole("link", { name: "Download photo", exact: true })).toBeVisible(); expect(events.length).toBe(before);
});
test("Do Not Track suppresses anonymous usage requests", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true }));
  const requests: string[] = []; page.on("request", (request) => { if (request.url().includes("/api/usage")) requests.push(request.url()); });
  await page.goto("/"); await expect(page.getByRole("button", { name: "Anonymous usage counts: off — turn on", exact: true })).toBeVisible(); expect(requests).toEqual([]);
});
