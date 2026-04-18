import { test, expect } from "@playwright/test";

test("app shell responds", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.ok() || res?.status() === 304).toBeTruthy();
  await expect(page.locator("body")).toBeVisible();
});
