import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const publicRoutes = [
  ["home", "/"],
  ["academy", "/academia"],
  ["course detail", "/academia/producao-musical-do-zero-ao-profissional"],
  ["public lesson", "/academia/producao-musical-do-zero-ao-profissional/aulas/boas-vindas"],
  ["marketplace", "/marketplace"],
  ["product detail", "/marketplace/pack-transicoes-e-efeitos"],
  ["beat marketplace", "/marketplace/beats"],
  ["beat detail", "/marketplace/beats/trap-atlantico"],
  ["cart", "/carrinho"],
  ["checkout", "/checkout"],
  ["content portal", "/conteudos"],
  ["content detail", "/conteudos/fluxo-de-trabalho-para-produzir-mais-musicas"],
  ["community", "/comunidade"],
  ["opportunities", "/oportunidades"],
  ["certificate validation", "/validar"],
  ["contact", "/contato"],
  ["privacy policy", "/politica-de-privacidade"],
  ["terms of use", "/termos-de-uso"],
] as const;

const portalRoutes = [
  ["student dashboard", "/aluno"],
  ["student courses", "/aluno/meus-cursos"],
  ["student course detail", "/aluno/cursos/d22c835b-cbfd-4c2a-9b1c-32a2df1c0800"],
  ["student certificates", "/aluno/certificados"],
  ["student downloads", "/aluno/downloads"],
  ["student library", "/aluno/biblioteca"],
  ["student community", "/aluno/comunidade"],
  ["student opportunities", "/aluno/oportunidades"],
  ["student orders", "/aluno/pedidos"],
  ["student favorites", "/aluno/favoritos"],
  ["student profile", "/aluno/perfil"],
  ["student settings", "/aluno/configuracoes"],
  ["student notifications", "/aluno/notificacoes"],
  ["student support", "/aluno/suporte"],
  ["student lesson", "/aula/95913cf3-a5e3-4b52-a729-b7449ea4f1fb"],

  ["instructor dashboard", "/instrutor"],
  ["instructor courses", "/instrutor/cursos"],
  ["instructor audience", "/instrutor/alunos-avaliacoes"],
  ["instructor reports", "/instrutor/relatorios"],

  ["producer dashboard", "/produtor"],
  ["producer beats", "/produtor/beats"],
  ["producer products", "/produtor/produtos"],
  ["producer orders", "/produtor/pedidos"],

  ["affiliate dashboard", "/afiliado"],
  ["affiliate links", "/afiliado/links"],
  ["affiliate conversions", "/afiliado/conversoes"],
  ["affiliate commissions", "/afiliado/comissoes"],
  ["affiliate withdrawals", "/afiliado/saques"],
  ["affiliate materials", "/afiliado/materiais"],
  ["affiliate profile", "/afiliado/perfil"],

  ["company dashboard", "/empresa"],
  ["company opportunities", "/empresa/oportunidades"],
  ["company candidates", "/empresa/candidatos"],
  ["company messages", "/empresa/mensagens"],
  ["company profile", "/empresa/perfil"],

  ["admin dashboard", "/admin"],
  ["admin users", "/admin/usuarios"],
  ["admin students", "/admin/alunos"],
  ["admin courses", "/admin/cursos"],
  ["admin products", "/admin/produtos"],
  ["admin orders", "/admin/pedidos"],
  ["admin coupons", "/admin/cupons"],
  ["admin content", "/admin/conteudos"],
  ["admin certificates", "/admin/certificados"],
  ["admin community", "/admin/comunidade"],
  ["admin reports", "/admin/relatorios"],
  ["admin observability", "/admin/observabilidade"],
  ["admin settings", "/admin/configuracoes"],
  ["admin integrations", "/admin/integracoes"],
  ["admin finance", "/admin/financeiro"],
  ["admin marketing", "/admin/marketing"],
  ["admin support", "/admin/suporte"],
  ["admin audit", "/admin/auditoria"],
  ["admin security", "/admin/seguranca"],
] as const;

async function assertHealthyRoute(page: Page, path: string, portal: boolean) {
  const pageErrors: string[] = [];
  const apiFailures: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes(".supabase.co/") && !url.includes("/auth/v1/") && response.status() >= 400) {
      apiFailures.push(`${response.status()} ${url}`);
    }
  });

  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => undefined);

  const snapshot = await page.evaluate(() => ({
    body: document.body.innerText.toLocaleLowerCase("pt-BR"),
    overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  expect(snapshot.body).not.toContain("página não encontrada");
  expect(snapshot.overflow).toBeLessThanOrEqual(4);
  expect(pageErrors).toEqual([]);
  expect(apiFailures).toEqual([]);

  if (portal) {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(page).toHaveURL(new RegExp(`${escapedPath}/?$`));
    expect(snapshot.body).not.toContain("como você deseja entrar?");
    expect(snapshot.body).not.toContain("acesso negado");
  }
}

for (const [name, path] of publicRoutes) {
  test(`public route: ${name}`, async ({ page }) => {
    await assertHealthyRoute(page, path, false);
  });
}

for (const [name, path] of portalRoutes) {
  test(`portal route: ${name}`, async ({ page }) => {
    await assertHealthyRoute(page, path, true);
  });
}

const mobileRoutes = [
  ["home", "/"],
  ["academy", "/academia"],
  ["marketplace", "/marketplace"],
  ["student", "/aluno"],
  ["instructor", "/instrutor"],
  ["producer", "/produtor"],
  ["affiliate", "/afiliado"],
  ["company", "/empresa"],
  ["admin", "/admin"],
] as const;

for (const [name, path] of mobileRoutes) {
  test(`mobile route: ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await assertHealthyRoute(page, path, path !== "/");
  });
}
