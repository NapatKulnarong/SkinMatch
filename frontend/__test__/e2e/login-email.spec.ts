import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("Email Login Flow", () => {
  test("renders login form and accepts input (no backend auth call)", async ({ page }) => {
    await page.goto(`${baseURL}/login`);

    // Open login mode from intro
    await page.getByTestId("go-login").click();

    const loginForm = page.getByTestId("login-form");
    await expect(loginForm).toBeVisible();

    await page.getByPlaceholder(/you@example\.com or yourusername/i).fill("user@example.com");
    await page.getByPlaceholder(/••••••••/).fill("Password123");

    // Do not submit to avoid calling backend; just ensure button is enabled
    await expect(page.getByRole("button", { name: /login/i })).toBeEnabled();
  });
});
