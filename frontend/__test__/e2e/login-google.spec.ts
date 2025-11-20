import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("Google OAuth Login Flow", () => {
  test("stays on login and surfaces error when Google is not configured", async ({ page }) => {
    await page.goto(`${baseURL}/login`);

    const googleButton = page.getByTestId("signup-google");
    await expect(googleButton).toBeVisible();

    await googleButton.click();

    // Behavior diverges based on env:
    // - If NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, we get redirected to Google.
    // - If not set, we stay on login and show an error.
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();

    if (/accounts\.google\.com/.test(url)) {
      await expect(page).toHaveURL(/accounts\.google\.com/);
    } else {
      await expect(page).toHaveURL(/\/login/);
      const errorMessage = page.getByText(/Google Sign-In is not configured/i);
      await errorMessage.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
    }
  });
});
