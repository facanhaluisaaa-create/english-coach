import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page explains the four skills and links to auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("personal AI English coach");
    for (const skill of ["C2 Language Coach", "TOEFL iBT Trainer", "Teaching Mentor", "Memory & Review Coach"]) {
      await expect(page.getByRole("heading", { name: skill })).toBeVisible();
    }
    await page.getByRole("link", { name: "Get started" }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("sign-in form validates and offers a magic link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await page.getByRole("button", { name: /magic link instead/i }).click();
    await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
  });

  test("sign-up form asks for a display name", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel(/call you/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("has no horizontal overflow on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile only");
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("route protection", () => {
  for (const path of ["/today", "/progress", "/memory", "/toefl", "/teaching", "/coach", "/settings", "/session/abc"]) {
    test(`redirects ${path} to login with a return URL`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    });
  }

  test("coach API rejects unauthenticated calls", async ({ request }) => {
    const res = await request.post("/api/coach", { data: { message: "hi" }, maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
});
