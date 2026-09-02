import { expect, test } from "@playwright/test";

test.describe("remote Supabase integration", () => {
  test.skip(
    process.env.E2E_REMOTE_INTEGRATION !== "true",
    "Remote integration checks run only during an environment release.",
  );

  test("public opportunities render expected remote records", async ({ page }) => {
    await page.goto("/oportunidades");
    await expect(page.getByRole("heading", { name: "Produtor musical freelancer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Collab com vocalista pop" })).toBeVisible();
    await expect(page.getByText("Nenhuma oportunidade encontrada")).not.toBeVisible();
  });
});
