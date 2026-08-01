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
  await page.goto("/academia");
  await expect(page.getByRole("heading", { name: /academia|cursos/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("public opportunities render records returned by the Supabase contract", async ({ page }) => {
  await page.route("**/rest/v1/opportunities?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": "0-1/2" },
      body: JSON.stringify([
        {
          id: "11111111-1111-4111-8111-111111111111",
          kind: "job",
          title: "Produtor musical freelancer",
          organization_name: "Estúdio VDM",
          location: "Remoto",
          engagement_type: "Freelance",
          status: "open",
          published_at: "2026-07-31T12:00:00.000Z",
          created_at: "2026-07-31T12:00:00.000Z",
          description: "Produção musical para projeto independente.",
          application_count: 3,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          kind: "collaboration",
          title: "Collab com vocalista pop",
          organization_name: "Comunidade VDM",
          location: "Brasil",
          engagement_type: "Projeto",
          status: "open",
          published_at: "2026-07-30T12:00:00.000Z",
          created_at: "2026-07-30T12:00:00.000Z",
          description: "Colaboração para lançamento autoral.",
          application_count: 1,
        },
      ]),
    });
  });

  await page.goto("/oportunidades");
  await expect(page.getByRole("heading", { name: "Produtor musical freelancer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Collab com vocalista pop" })).toBeVisible();
  await expect(page.getByText("Nenhuma oportunidade encontrada")).not.toBeVisible();
});

test("development auth bypass exposes the administrative review route", async ({ page }) => {
  await page.goto("/admin/observabilidade");
  await expect(page).toHaveURL(/\/admin\/observabilidade/);
  await expect(page.getByRole("heading", { name: /observabilidade/i }).first()).toBeVisible();
});

test("unknown routes return the application not-found screen", async ({ page }) => {
  await page.goto("/rota-que-nao-existe");
  await expect(page.locator("body")).toContainText(/não encontrada|404/i);
});
