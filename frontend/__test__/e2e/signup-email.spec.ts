import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("Email sign up flow", () => {
  test("renders signup form and required toggles (no backend submit)", async ({ page }) => {
    await page.goto(`${baseURL}/login`);

    // Open signup form from intro
    await page.getByTestId("signup-email").click();

    const signupForm = page.getByTestId("signup-form");
    await expect(signupForm).toBeVisible();

    await page.getByPlaceholder(/your name/i).fill("Test");
    await page.getByPlaceholder(/your surname/i).fill("User");
    await page.locator('input[name="dob"]').fill("2000-01-01");
    await page.locator('select[name="gender"]').selectOption({ value: "female" });

    await page.getByPlaceholder(/pick a username/i).fill("testuser_e2e");
    await page.getByPlaceholder(/you@example\.com/i).fill("testuser_e2e@example.com");
    await page.getByPlaceholder(/•{4,}/).fill("Password123!");
    await page.getByPlaceholder(/Re-enter password/i).fill("Password123!");

    await page.getByTestId("accept-terms").check();
    await page.getByTestId("accept-privacy").check();

    await expect(page.getByRole("button", { name: /confirm/i })).toBeEnabled();
  });
});
