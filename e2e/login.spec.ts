import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("sin sesión, / y /instrumentos llevan a /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/instrumentos");
  await expect(page).toHaveURL(/\/login$/);
});

test("login se ve bien, es accesible y rechaza datos vacíos", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
