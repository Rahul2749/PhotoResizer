import { test, expect } from "@playwright/test";

const dashboard = {
  days: 30, page: 1, pageSize: 20, totalOrders: 1,
  payments: { orders: 1, captured_orders: 1, captured_paise: 500, refunded_paise: 0, donations_paise: 0, active_passes: 1, afterRefundsPaise: 500 },
  usage: { enabled: true, activeNow: 2, totals: { visit: 12, page_view: 19, image_processed: 8, crop_completed: 4, download: 6, zip_download: 1 }, trend: [{ day: "2026-11-05", event: "visit", count: 12 }, { day: "2026-11-05", event: "image_processed", count: 8 }], presets: [{ preset: "custom", count: 8 }], sizes: [{ size_bucket: "20_50kb", dimension_bucket: "301_1000px", count: 8 }] },
  orders: [{ id: "23456789-1234-1234-1234-123456789abc", product_id: "zip-day", mode: "live", amount_paise: 500, status: "paid", email: "private-buyer@example.test", payment_id: "pay_fixture", created_at: "2026-11-05T00:00:00Z", paid_at: "2026-11-05T00:01:00Z", expires_at: "2026-11-06T00:01:00Z", refunded_paise: 0 }]
};
test("admin requires login and shows payments and anonymous usage on mobile", async ({ page }, testInfo) => {
  let authenticated = false, csrf = "";
  await page.route("**/api/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/login")) { const input = route.request().postDataJSON(); expect(input).toEqual({ username: "fixture-owner", password: "fixture-password-only" }); authenticated = true; return route.fulfill({ json: { authenticated, username: "fixture-owner", csrfToken: "fixture-csrf" } }); }
    if (path.endsWith("/logout")) { csrf = route.request().headers()["x-csrf-token"]; authenticated = false; return route.fulfill({ json: { signedOut: true } }); }
    if (path.endsWith("/dashboard")) return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? dashboard : { error: "Sign in to the admin panel." } });
    return route.fulfill({ json: { configured: true, authenticated } });
  });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/admin-photoresize-mgrrntech");
  await expect(page.getByRole("heading", { name: "Sign in to your dashboard" })).toBeVisible(); await expect(page.getByText("private-buyer@example.test")).toHaveCount(0);
  await page.getByLabel("Username", { exact: true }).fill("fixture-owner"); await page.getByLabel("Password", { exact: true }).fill("fixture-password-only"); await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByRole("heading", { name: "Payments & tool activity" })).toBeVisible(); await expect(page.getByRole("cell", { name: /private-buyer/ })).toBeVisible(); await expect(page.getByRole("heading", { name: "Crops completed", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: testInfo.outputPath("admin-phone.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: testInfo.outputPath("admin-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click(); expect(csrf).toBe("fixture-csrf"); await expect(page.getByRole("heading", { name: "Sign in to your dashboard" })).toBeVisible(); await expect(page.getByText("private-buyer@example.test")).toHaveCount(0);
});
test("admin route is noindex, excluded from sitemap, and has no default password", async ({ page, request }) => {
  await page.route("**/api/admin/session", (route) => route.fulfill({ json: { configured: false, authenticated: false } })); await page.goto("/admin-photoresize-mgrrntech");
  await expect(page.getByText("Admin access has not been configured.", { exact: false })).toBeVisible(); await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/); await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("admin-photoresize-mgrrntech");
});
test("an expired admin session removes financial data and returns to sign in", async ({ page }) => {
  await page.route("**/api/admin/session", (route) => route.fulfill({ json: { configured: true, authenticated: true, username: "fixture-owner", csrfToken: "fixture-csrf" } })); await page.route("**/api/admin/dashboard**", (route) => route.fulfill({ json: dashboard })); await page.goto("/admin-photoresize-mgrrntech"); await expect(page.getByRole("cell", { name: /private-buyer/ })).toBeVisible();
  await page.route("**/api/admin/dashboard**", (route) => route.fulfill({ status: 401, json: { error: "Sign in to the admin panel." } })); await page.getByRole("button", { name: "Refresh dashboard" }).click(); await expect(page.getByRole("heading", { name: "Sign in to your dashboard" })).toBeVisible(); await expect(page.getByText("private-buyer@example.test")).toHaveCount(0);
});
