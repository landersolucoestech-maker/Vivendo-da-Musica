import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  throw new Error('PREVIEW_URL is required.');
}

const baseUrl = new URL(previewUrl);
const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
const reportDirectory = 'artifacts/preview-audit';

const publicRoutes = [
  { path: '', name: 'home', requireOkStatus: true, mobile: true },
  { path: 'login', name: 'login' },
  { path: 'matricule-se', name: 'register' },
  { path: 'esqueceu-senha', name: 'forgot-password' },
  { path: 'contato', name: 'contact' },
  { path: 'politica-de-privacidade', name: 'privacy-policy' },
  { path: 'termos-de-uso', name: 'terms-of-use' },
  { path: 'academia', name: 'academy', mobile: true },
  { path: 'academia/producao-musical-do-zero-ao-profissional', name: 'course-detail' },
  { path: 'academia/producao-musical-do-zero-ao-profissional/aulas/boas-vindas', name: 'public-lesson' },
  { path: 'marketplace', name: 'marketplace', mobile: true },
  { path: 'marketplace/pack-transicoes-e-efeitos', name: 'product-detail' },
  { path: 'marketplace/beats', name: 'beat-marketplace' },
  { path: 'marketplace/beats/trap-atlantico', name: 'beat-detail' },
  { path: 'carrinho', name: 'cart' },
  { path: 'checkout', name: 'checkout' },
  { path: 'conteudos', name: 'content-portal' },
  { path: 'conteudos/fluxo-de-trabalho-para-produzir-mais-musicas', name: 'content-detail' },
  { path: 'comunidade', name: 'community-public' },
  { path: 'biblioteca-premium', name: 'premium-library-public' },
  { path: 'oportunidades', name: 'opportunities-public', mobile: true },
  { path: 'validar', name: 'certificate-validation' },
  { path: '__preview-route-not-found__', name: 'spa-not-found', expectNotFound: true },
];

const portalRoutes = [
  { path: 'aluno', name: 'student-dashboard', mobile: true },
  { path: 'aluno/meus-cursos', name: 'student-courses' },
  { path: 'aluno/cursos/d22c835b-cbfd-4c2a-9b1c-32a2df1c0800', name: 'student-course-detail' },
  { path: 'aluno/certificados', name: 'student-certificates' },
  { path: 'aluno/downloads', name: 'student-downloads' },
  { path: 'aluno/beats', name: 'student-beats-legacy', expectedFinalPath: 'aluno/downloads' },
  { path: 'aluno/biblioteca-premium', name: 'student-premium-library' },
  { path: 'aluno/comunidade', name: 'student-community' },
  { path: 'aluno/oportunidades', name: 'student-opportunities' },
  { path: 'aluno/pedidos', name: 'student-orders' },
  { path: 'aluno/favoritos', name: 'student-favorites' },
  { path: 'aluno/perfil', name: 'student-profile' },
  { path: 'aluno/configuracoes', name: 'student-settings' },
  { path: 'aluno/notificacoes', name: 'student-notifications' },
  { path: 'aluno/suporte', name: 'student-support' },
  { path: 'aula/95913cf3-a5e3-4b52-a729-b7449ea4f1fb', name: 'student-lesson' },

  { path: 'instrutor', name: 'instructor-dashboard', mobile: true },
  { path: 'instrutor/cursos', name: 'instructor-courses' },
  { path: 'instrutor/alunos-avaliacoes', name: 'instructor-audience' },
  { path: 'instrutor/relatorios', name: 'instructor-reports' },

  { path: 'produtor', name: 'producer-dashboard', mobile: true },
  { path: 'produtor/beats', name: 'producer-beats' },
  { path: 'produtor/produtos', name: 'producer-products' },
  { path: 'produtor/pedidos', name: 'producer-orders' },

  { path: 'afiliado', name: 'affiliate-dashboard', mobile: true },
  { path: 'afiliado/links', name: 'affiliate-links' },
  { path: 'afiliado/conversoes', name: 'affiliate-conversions' },
  { path: 'afiliado/comissoes', name: 'affiliate-commissions' },
  { path: 'afiliado/saques', name: 'affiliate-withdrawals' },
  { path: 'afiliado/materiais', name: 'affiliate-materials' },
  { path: 'afiliado/perfil', name: 'affiliate-profile' },

  { path: 'empresa', name: 'company-dashboard', mobile: true },
  { path: 'empresa/oportunidades', name: 'company-opportunities' },
  { path: 'empresa/candidatos', name: 'company-candidates' },
  { path: 'empresa/mensagens', name: 'company-messages' },
  { path: 'empresa/perfil', name: 'company-profile' },

  { path: 'admin', name: 'admin-dashboard', mobile: true },
  { path: 'admin/usuarios', name: 'admin-users' },
  { path: 'admin/alunos', name: 'admin-students' },
  { path: 'admin/cursos', name: 'admin-courses' },
  { path: 'admin/produtos', name: 'admin-products' },
  { path: 'admin/pedidos', name: 'admin-orders' },
  { path: 'admin/cupons', name: 'admin-coupons' },
  { path: 'admin/conteudos', name: 'admin-content' },
  { path: 'admin/certificados', name: 'admin-certificates' },
  { path: 'admin/comunidade', name: 'admin-community' },
  { path: 'admin/relatorios', name: 'admin-reports' },
  { path: 'admin/observabilidade', name: 'admin-observability' },
  { path: 'admin/configuracoes', name: 'admin-settings' },
  { path: 'admin/integracoes', name: 'admin-integrations' },
  { path: 'admin/financeiro', name: 'admin-finance' },
  { path: 'admin/marketing', name: 'admin-marketing' },
  { path: 'admin/suporte', name: 'admin-support' },
  { path: 'admin/auditoria', name: 'admin-audit' },
  { path: 'admin/seguranca', name: 'admin-security' },
].map((route) => ({ ...route, portal: true }));

const desktopViewport = { width: 1440, height: 900, label: 'desktop' };
const mobileViewport = { width: 390, height: 844, label: 'mobile' };
const routes = [...publicRoutes, ...portalRoutes];
const executions = [
  ...routes.map((route) => ({ route, viewport: desktopViewport })),
  ...routes.filter((route) => route.mobile).map((route) => ({ route, viewport: mobileViewport })),
];

await mkdir(reportDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];
const warnings = [];
const results = [];

const normalizePath = (pathname) => pathname.replace(/\/+$/, '') || '/';
const requestedPathFor = (routePath) => normalizePath(`${basePath}${routePath}`);
const safeName = (value) => value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '');

const recordFailure = (result, message) => {
  result.failures.push(message);
  failures.push(`${result.viewport}/${result.route}: ${message}`);
};

const recordWarning = (result, message) => {
  result.warnings.push(message);
  warnings.push(`${result.viewport}/${result.route}: ${message}`);
};

try {
  for (const execution of executions) {
    const { route, viewport } = execution;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const failedAssets = [];
    const failedResponses = [];
    const consoleErrors = [];
    const result = {
      route: route.name,
      path: route.path,
      expectedFinalPath: route.expectedFinalPath ?? route.path,
      viewport: viewport.label,
      status: 0,
      finalUrl: '',
      title: '',
      bodyTextLength: 0,
      rootChildCount: 0,
      horizontalOverflow: 0,
      pageErrors,
      failedAssets,
      failedResponses,
      consoleErrors,
      failures: [],
      warnings: [],
    };

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      const requestUrl = new URL(request.url());
      const resourceType = request.resourceType();
      const isFirstParty = requestUrl.origin === baseUrl.origin && requestUrl.pathname.startsWith(basePath);
      if (isFirstParty && ['document', 'script', 'stylesheet'].includes(resourceType)) {
        failedAssets.push(`${resourceType} ${request.url()} — ${request.failure()?.errorText ?? 'request failed'}`);
      }
    });
    page.on('response', (response) => {
      const responseUrl = new URL(response.url());
      const resourceType = response.request().resourceType();
      const isFirstParty = responseUrl.origin === baseUrl.origin && responseUrl.pathname.startsWith(basePath);
      if (isFirstParty && ['script', 'stylesheet'].includes(resourceType) && response.status() >= 400) {
        failedAssets.push(`${resourceType} ${response.url()} — HTTP ${response.status()}`);
      }
      if (response.status() >= 400 && resourceType !== 'document') {
        failedResponses.push(`${resourceType} ${response.url()} — HTTP ${response.status()}`);
      }
    });

    const url = new URL(route.path, previewUrl).toString();

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      result.status = response?.status() ?? 0;
      result.finalUrl = page.url();

      if (route.requireOkStatus && result.status !== 200) {
        recordFailure(result, `esperado HTTP 200, recebido ${result.status || 'sem resposta'}`);
      } else if (!route.requireOkStatus && ![200, 404].includes(result.status)) {
        recordFailure(result, `esperado HTTP 200 ou fallback SPA 404, recebido ${result.status || 'sem resposta'}`);
      } else if (result.status === 404 && !route.expectNotFound) {
        recordWarning(result, 'GitHub Pages entregou a rota direta por 404.html, fallback esperado para SPA.');
      }

      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return Boolean(root && root.childElementCount > 0);
        },
        undefined,
        { timeout: 30_000 },
      );

      await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {
        recordWarning(result, 'A rede não ficou ociosa em 6 segundos; validação continuou pelo DOM.');
      });

      const snapshot = await page.evaluate(() => {
        const root = document.querySelector('#root');
        const bodyText = document.body.innerText.trim();
        return {
          title: document.title,
          bodyText,
          bodyTextLength: bodyText.length,
          rootChildCount: root?.childElementCount ?? 0,
          horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
          stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((link) => link.href).filter(Boolean),
        };
      });

      result.title = snapshot.title;
      result.bodyTextLength = snapshot.bodyTextLength;
      result.rootChildCount = snapshot.rootChildCount;
      result.horizontalOverflow = snapshot.horizontalOverflow;

      if (snapshot.rootChildCount === 0 || snapshot.bodyTextLength === 0) {
        recordFailure(result, 'A raiz React não apresentou conteúdo visível.');
      }
      if (route.name === 'home' && (snapshot.scripts.length === 0 || snapshot.stylesheets.length === 0)) {
        recordFailure(result, 'A Home não carregou os bundles JavaScript e CSS esperados.');
      }
      if (snapshot.horizontalOverflow > 4) {
        recordFailure(result, `A página excede horizontalmente o viewport em ${snapshot.horizontalOverflow}px.`);
      }

      const finalPath = normalizePath(new URL(page.url()).pathname);
      const requestedPath = requestedPathFor(route.path);
      const expectedFinalPath = requestedPathFor(route.expectedFinalPath ?? route.path);
      if (!route.expectNotFound && finalPath !== expectedFinalPath) {
        recordFailure(result, `A rota ${requestedPath} terminou em ${finalPath}; esperado ${expectedFinalPath}.`);
      }

      const bodyLower = snapshot.bodyText.toLocaleLowerCase('pt-BR');
      const renderedNotFound = bodyLower.includes('página não encontrada') || bodyLower.includes('pagina não encontrada');
      if (route.expectNotFound && !renderedNotFound && !bodyLower.includes('404')) {
        recordFailure(result, 'A rota inexistente não exibiu a tela de 404.');
      }
      if (!route.expectNotFound && renderedNotFound) {
        recordFailure(result, 'A rota válida exibiu a tela de página não encontrada.');
      }
      if (route.portal && (bodyLower.includes('como você deseja entrar?') || bodyLower.includes('acesso negado'))) {
        recordFailure(result, 'O portal foi substituído por tela de login ou acesso negado no preview dev.');
      }

      if (pageErrors.length > 0) recordFailure(result, `Erros JavaScript não tratados: ${pageErrors.join(' | ')}`);
      if (failedAssets.length > 0) recordFailure(result, `Falhas em assets críticos: ${failedAssets.join(' | ')}`);
      if (failedResponses.length > 0) recordWarning(result, `Respostas HTTP não críticas: ${failedResponses.join(' | ')}`);
      if (consoleErrors.length > 0) recordWarning(result, `Erros observados no console: ${consoleErrors.join(' | ')}`);
    } catch (error) {
      recordFailure(result, error instanceof Error ? error.message : String(error));
    }

    if (result.failures.length > 0) {
      const screenshotPath = `${reportDirectory}/${safeName(`${viewport.label}-${route.name}`)}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    }

    results.push(result);
    console.log(JSON.stringify(result, null, 2));
    await page.close();
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  previewUrl,
  generatedAt: new Date().toISOString(),
  totalExecutions: results.length,
  passedExecutions: results.filter((result) => result.failures.length === 0).length,
  failedExecutions: results.filter((result) => result.failures.length > 0).length,
  warningCount: warnings.length,
  failures,
  warnings,
  results,
};

await writeFile(`${reportDirectory}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const warning of warnings) console.warn(`WARNING: ${warning}`);

if (failures.length > 0) {
  throw new Error(`Live Pages verification failed:\n- ${failures.join('\n- ')}`);
}

console.log(`Live Pages verification passed for ${previewUrl}: ${report.passedExecutions}/${report.totalExecutions} executions approved.`);
