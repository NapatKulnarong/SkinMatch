import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("SkinMatch Quiz Flow", () => {
  test("renders first quiz step and navigates to step 2", async ({ page }) => {
    await page.goto(`${baseURL}/quiz`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "What is your main skincare concern?"
    );

    // choose first available option
    const firstOption = page.getByRole("button", { name: /acne/i }).first();
    await firstOption.click();

    // Should navigate to step 2
    await page.waitForURL("**/quiz/step/2");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Do you have any secondary concerns?"
    );
  });
});
