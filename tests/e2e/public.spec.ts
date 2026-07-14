import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("home renders the public product navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Vivendo da Música/i);
  await expect(page.locator("body")).toContainText(/Vivendo da Música/i);
});

test("course catalog is reachable and has no fatal browser error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cursos");
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("administrative routes require authentication", async ({ page }) => {
  await page.goto("/admin/observabilidade");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown routes return the application not-found screen", async ({ page }) => {
  await page.goto("/rota-que-nao-existe");
  await expect(page.locator("body")).toContainText(/não encontrada|404/i);
});
