import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const previewUrl = process.env.PREVIEW_URL;
const buildSha = process.env.BUILD_SHA;

if (!previewUrl || !buildSha) {
  throw new Error('PREVIEW_URL e BUILD_SHA são obrigatórios.');
}

await mkdir('artifacts/preview-audit', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const failedAssets = [];
const consoleErrors = [];
const responses = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  failedAssets.push(
    `${request.resourceType()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`,
  );
});
page.on('response', (response) => {
  const request = response.request();
  if (['document', 'script', 'stylesheet'].includes(request.resourceType())) {
    responses.push({
      type: request.resourceType(),
      status: response.status(),
      url: response.url(),
      contentType: response.headers()['content-type'] ?? '',
    });
  }
});

let status = 0;
let stage = 'navigation';
let caughtError = null;
let home = null;
let academy = null;
let student = null;
let homeScroll = null;
let academyShell = null;
let studentScroll = null;

const snapshotPage = async () =>
  page.evaluate(() => ({
    title: document.title,
    bodyText: document.body.innerText.trim(),
    bodyHtml: document.body.innerHTML.slice(0, 10_000),
    rootHtml: document.querySelector('#root')?.innerHTML.slice(0, 10_000) ?? '',
    rootChildCount: document.querySelector('#root')?.childElementCount ?? 0,
    pageCount: document.querySelectorAll('.vdm-page').length,
    scriptCount: Array.from(document.scripts).filter((script) => Boolean(script.src)).length,
    stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length,
    commit: document.querySelector('meta[name="vdm-preview-commit"]')?.getAttribute('content') ?? '',
    path: window.location.pathname,
    hash: window.location.hash,
    sourceUrl: window.__VDM_PREVIEW_DOCUMENT_URL__ ?? '',
  }));

const captureShell = async (scrollTestId) =>
  page.evaluate((testId) => {
    const header = document.querySelector('[data-testid="public-header"]');
    const logo = header?.querySelector('[aria-label="Vivendo da Música — início"]');
    const academyLink = Array.from(header?.querySelectorAll('a') ?? []).find(
      (link) => link.textContent?.trim() === 'Academia',
    );
    const content = document.querySelector(`[data-testid="${testId}"]`);
    const headerRect = header?.getBoundingClientRect();
    const contentRect = content?.getBoundingClientRect();

    return {
      headerPosition: header ? getComputedStyle(header).position : '',
      headerTop: headerRect?.top ?? null,
      headerBottom: headerRect?.bottom ?? null,
      logoTop: logo?.getBoundingClientRect().top ?? null,
      academyTop: academyLink?.getBoundingClientRect().top ?? null,
      contentTop: contentRect?.top ?? null,
      contentBottom: contentRect?.bottom ?? null,
      contentOverflowY: content ? getComputedStyle(content).overflowY : '',
      contentScrollTop: content?.scrollTop ?? null,
      contentScrollHeight: content?.scrollHeight ?? null,
      contentClientHeight: content?.clientHeight ?? null,
      windowScrollY: window.scrollY,
      documentScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  }, scrollTestId);

const scrollShell = async (scrollTestId) => {
  const before = await captureShell(scrollTestId);
  await page.evaluate((testId) => {
    const content = document.querySelector(`[data-testid="${testId}"]`);
    if (!(content instanceof HTMLElement)) return;
    const maximumScroll = Math.max(0, content.scrollHeight - content.clientHeight);
    content.scrollTo(0, Math.min(1_200, maximumScroll));
  }, scrollTestId);
  await page.waitForTimeout(500);
  const after = await captureShell(scrollTestId);
  return { before, after };
};

const navigateClientSide = async (path) => {
  await page.evaluate((nextPath) => {
    window.history.pushState(null, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForFunction((nextPath) => window.location.pathname === nextPath, path, {
    timeout: 10_000,
  });
};

try {
  const response = await page.goto(previewUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  status = response?.status() ?? 0;

  stage = 'home';
  await page.locator('.vdm-page').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('[data-testid="public-header"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('[data-testid="home-content-scroll"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(2_000);
  home = await snapshotPage();
  homeScroll = await scrollShell('home-content-scroll');

  stage = 'academy';
  await navigateClientSide('/academia');
  await page.waitForFunction(
    () => !document.body.innerText.includes('ERRO 404') && document.body.innerText.trim().length > 100,
    undefined,
    { timeout: 20_000 },
  );
  await page.locator('[data-testid="public-content-scroll"]').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(1_000);
  academy = await snapshotPage();
  academyShell = await captureShell('public-content-scroll');

  stage = 'student-portal';
  await navigateClientSide('/aluno');
  await page.locator('[data-testid="student-content-scroll"]').waitFor({
    state: 'visible',
    timeout: 30_000,
  });
  await page.waitForTimeout(2_000);
  student = await snapshotPage();
  studentScroll = await scrollShell('student-content-scroll');
} catch (error) {
  caughtError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  try {
    if (!home) home = await snapshotPage();
  } catch (snapshotError) {
    consoleErrors.push(
      `Falha ao capturar o estado da página: ${snapshotError instanceof Error ? snapshotError.message : String(snapshotError)}`,
    );
  }
} finally {
  try {
    await page.screenshot({ path: 'artifacts/preview-audit/fixed-header.png', fullPage: false });
  } catch (screenshotError) {
    consoleErrors.push(
      `Falha ao capturar screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`,
    );
  }

  const report = {
    url: previewUrl,
    status,
    stage,
    caughtError,
    home: home ? { ...home, bodyTextLength: home.bodyText.length } : null,
    homeScroll,
    academy: academy ? { ...academy, bodyTextLength: academy.bodyText.length } : null,
    academyShell,
    student: student ? { ...student, bodyTextLength: student.bodyText.length } : null,
    studentScroll,
    pageErrors,
    failedAssets,
    consoleErrors,
    responses,
  };
  await writeFile('artifacts/preview-audit/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

const failures = [];
if (caughtError) failures.push(`${stage}: ${caughtError}`);
if (status !== 200) failures.push(`HTTP ${status}`);
if (!home) {
  failures.push('Não foi possível capturar a Home.');
} else {
  if (home.commit !== buildSha) failures.push(`Build inesperado: ${home.commit}`);
  if (home.path !== '/') failures.push(`Pathname inicial não normalizado: ${home.path}`);
  if (!home.sourceUrl.includes('/index.html')) failures.push('A URL de origem do documento não foi preservada.');
  if (home.pageCount === 0 || home.rootChildCount === 0 || home.bodyText.length < 100) {
    failures.push('A Home real não foi renderizada.');
  }
  if (home.bodyText.includes('ERRO 404') || home.bodyText.includes('Página não encontrada')) {
    failures.push('A aplicação abriu a página 404 interna.');
  }
  if (home.scriptCount === 0 || home.stylesheetCount === 0) {
    failures.push('Bundles JavaScript ou CSS ausentes.');
  }
  if (home.bodyText.includes('Não foi possível abrir a plataforma')) {
    failures.push('Fallback fatal foi exibido.');
  }
  if (home.bodyText.includes('Carregando Vivendo da Música')) {
    failures.push('Aplicação permaneceu no bootstrap.');
  }
}

const validateShell = (label, state, { requireScroll }) => {
  if (!state) {
    failures.push(`${label}: estrutura de rolagem não validada.`);
    return;
  }

  const before = 'before' in state ? state.before : state;
  const after = 'after' in state ? state.after : state;

  if (before.headerPosition !== 'fixed' || after.headerPosition !== 'fixed') {
    failures.push(`${label}: cabeçalho não está fixed (${before.headerPosition}/${after.headerPosition}).`);
  }
  if (after.contentOverflowY !== 'auto') {
    failures.push(`${label}: conteúdo não controla a rolagem (${after.contentOverflowY}).`);
  }
  if (after.windowScrollY !== 0) {
    failures.push(`${label}: o documento rolou ${after.windowScrollY}px.`);
  }
  if (after.documentScrollHeight > after.viewportHeight + 1) {
    failures.push(
      `${label}: ainda existe scrollbar global (${after.documentScrollHeight}px para viewport de ${after.viewportHeight}px).`,
    );
  }
  if (
    before.headerBottom === null ||
    before.contentTop === null ||
    Math.abs(before.contentTop - before.headerBottom) > 1
  ) {
    failures.push(
      `${label}: área rolável não começa exatamente abaixo do cabeçalho (header=${before.headerBottom}, conteúdo=${before.contentTop}).`,
    );
  }
  if (Math.abs(after.headerTop ?? Number.POSITIVE_INFINITY) > 1) {
    failures.push(`${label}: cabeçalho saiu do topo (${after.headerTop}px).`);
  }

  for (const key of ['headerTop', 'logoTop', 'academyTop']) {
    const initial = before[key];
    const current = after[key];
    if (initial === null || current === null || Math.abs(initial - current) > 1) {
      failures.push(`${label}: ${key} se moveu (${initial} → ${current}).`);
    }
  }

  if (requireScroll && (after.contentScrollTop ?? 0) < 100) {
    failures.push(`${label}: área interna rolou apenas ${after.contentScrollTop}px.`);
  }
};

validateShell('Home', homeScroll, { requireScroll: true });
validateShell('Páginas públicas', academyShell, { requireScroll: false });
validateShell('Portal do aluno', studentScroll, { requireScroll: true });

if (
  !academy ||
  academy.path !== '/academia' ||
  academy.rootChildCount === 0 ||
  academy.bodyText.length < 100 ||
  academy.bodyText.includes('ERRO 404')
) {
  failures.push('A rota pública /academia não foi renderizada.');
}

if (
  !student ||
  student.path !== '/aluno' ||
  student.rootChildCount === 0 ||
  student.bodyText.length < 100 ||
  student.bodyText.includes('ERRO 404')
) {
  failures.push('O portal do aluno não foi renderizado.');
}

if (pageErrors.length > 0) failures.push(`Erros JavaScript: ${pageErrors.join(' | ')}`);
if (failedAssets.length > 0) {
  failures.push(`Requisições falharam: ${failedAssets.join(' | ')}`);
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}
