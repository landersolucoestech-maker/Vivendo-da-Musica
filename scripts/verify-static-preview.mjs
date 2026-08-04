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
let fixedHeader = null;
let studentScroll = null;

const snapshotPage = async () =>
  page.evaluate(() => ({
    title: document.title,
    bodyText: document.body.innerText.trim(),
    bodyHtml: document.body.innerHTML.slice(0, 10_000),
    rootHtml: document.querySelector('#root')?.innerHTML.slice(0, 10_000) ?? '',
    rootChildCount: document.querySelector('#root')?.childElementCount ?? 0,
    homeCount: document.querySelectorAll('.vdm-page').length,
    scriptCount: Array.from(document.scripts).filter((script) => Boolean(script.src)).length,
    stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length,
    commit: document.querySelector('meta[name="vdm-preview-commit"]')?.getAttribute('content') ?? '',
    path: window.location.pathname,
    hash: window.location.hash,
    sourceUrl: window.__VDM_PREVIEW_DOCUMENT_URL__ ?? '',
  }));

const captureHeaderPosition = async () =>
  page.evaluate(() => {
    const header = document.querySelector('[data-testid="public-header"]');
    const logo = header?.querySelector('[aria-label="Vivendo da Música — início"]');
    const academyLink = Array.from(header?.querySelectorAll('a') ?? []).find(
      (link) => link.textContent?.trim() === 'Academia',
    );

    return {
      position: header ? getComputedStyle(header).position : '',
      headerTop: header?.getBoundingClientRect().top ?? null,
      logoTop: logo?.getBoundingClientRect().top ?? null,
      academyTop: academyLink?.getBoundingClientRect().top ?? null,
      scrollY: window.scrollY,
    };
  });

const captureStudentLayout = async () =>
  page.evaluate(() => {
    const header = document.querySelector('[data-testid="public-header"]');
    const logo = header?.querySelector('[aria-label="Vivendo da Música — início"]');
    const content = document.querySelector('[data-testid="student-content-scroll"]');
    const headerRect = header?.getBoundingClientRect();
    const contentRect = content?.getBoundingClientRect();

    return {
      headerPosition: header ? getComputedStyle(header).position : '',
      headerTop: headerRect?.top ?? null,
      headerBottom: headerRect?.bottom ?? null,
      logoTop: logo?.getBoundingClientRect().top ?? null,
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
  });

try {
  const response = await page.goto(previewUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });
  status = response?.status() ?? 0;

  stage = 'home';
  await page.locator('.vdm-page').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('[data-testid="public-header"]').waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(2_000);
  home = await snapshotPage();

  stage = 'fixed-header';
  const beforeScroll = await captureHeaderPosition();
  await page.evaluate(() => {
    const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(1_200, maximumScroll));
  });
  await page.waitForTimeout(500);
  const afterScroll = await captureHeaderPosition();
  fixedHeader = { beforeScroll, afterScroll };
  await page.evaluate(() => window.scrollTo(0, 0));

  stage = 'academy';
  await page.evaluate(() => {
    window.history.pushState(null, '', '/academia');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForFunction(() => window.location.pathname === '/academia', undefined, {
    timeout: 10_000,
  });
  await page.waitForFunction(
    () => !document.body.innerText.includes('ERRO 404') && document.body.innerText.trim().length > 100,
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1_000);
  academy = await snapshotPage();

  stage = 'student-portal';
  await page.evaluate(() => {
    window.history.pushState(null, '', '/aluno');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForFunction(() => window.location.pathname === '/aluno', undefined, {
    timeout: 10_000,
  });
  await page.locator('[data-testid="student-content-scroll"]').waitFor({
    state: 'visible',
    timeout: 30_000,
  });
  await page.waitForTimeout(2_000);
  student = await snapshotPage();

  const beforeContentScroll = await captureStudentLayout();
  await page.evaluate(() => {
    const content = document.querySelector('[data-testid="student-content-scroll"]');
    if (!(content instanceof HTMLElement)) return;
    const maximumScroll = Math.max(0, content.scrollHeight - content.clientHeight);
    content.scrollTo(0, Math.min(1_200, maximumScroll));
  });
  await page.waitForTimeout(500);
  const afterContentScroll = await captureStudentLayout();
  studentScroll = { beforeContentScroll, afterContentScroll };
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
    await page.screenshot({ path: 'artifacts/preview-audit/student-portal.png', fullPage: false });
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
    fixedHeader,
    academy: academy ? { ...academy, bodyTextLength: academy.bodyText.length } : null,
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
  if (home.homeCount === 0 || home.rootChildCount === 0 || home.bodyText.length < 100) {
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

if (!fixedHeader) {
  failures.push('A posição do cabeçalho não foi validada.');
} else {
  const { beforeScroll, afterScroll } = fixedHeader;
  if (beforeScroll.position !== 'fixed' || afterScroll.position !== 'fixed') {
    failures.push(`Cabeçalho não está fixed: ${beforeScroll.position}/${afterScroll.position}`);
  }
  if (afterScroll.scrollY < 100) {
    failures.push(`A Home não rolou o suficiente para validar o cabeçalho: ${afterScroll.scrollY}px.`);
  }
  for (const key of ['headerTop', 'logoTop', 'academyTop']) {
    const before = beforeScroll[key];
    const after = afterScroll[key];
    if (before === null || after === null || Math.abs(before - after) > 1) {
      failures.push(`${key} se moveu durante a rolagem da Home: ${before} → ${after}.`);
    }
  }
  if (Math.abs(afterScroll.headerTop ?? Number.POSITIVE_INFINITY) > 1) {
    failures.push(`Cabeçalho saiu do topo da viewport: ${afterScroll.headerTop}px.`);
  }
}

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

if (!studentScroll) {
  failures.push('A rolagem isolada do portal do aluno não foi validada.');
} else {
  const { beforeContentScroll, afterContentScroll } = studentScroll;
  if (
    beforeContentScroll.headerPosition !== 'fixed' ||
    afterContentScroll.headerPosition !== 'fixed'
  ) {
    failures.push(
      `Cabeçalho do portal não está fixed: ${beforeContentScroll.headerPosition}/${afterContentScroll.headerPosition}.`,
    );
  }
  if (afterContentScroll.contentOverflowY !== 'auto') {
    failures.push(`O conteúdo do portal não controla a rolagem: ${afterContentScroll.contentOverflowY}.`);
  }
  if ((afterContentScroll.contentScrollTop ?? 0) < 100) {
    failures.push(
      `A área interna do portal não rolou o suficiente: ${afterContentScroll.contentScrollTop}px.`,
    );
  }
  if (afterContentScroll.windowScrollY !== 0) {
    failures.push(`O documento rolou junto com o portal: ${afterContentScroll.windowScrollY}px.`);
  }
  if (afterContentScroll.documentScrollHeight > afterContentScroll.viewportHeight + 1) {
    failures.push(
      `O documento ainda possui scrollbar global: ${afterContentScroll.documentScrollHeight}px para viewport de ${afterContentScroll.viewportHeight}px.`,
    );
  }
  for (const key of ['headerTop', 'logoTop']) {
    const before = beforeContentScroll[key];
    const after = afterContentScroll[key];
    if (before === null || after === null || Math.abs(before - after) > 1) {
      failures.push(`${key} se moveu durante a rolagem interna: ${before} → ${after}.`);
    }
  }
  if (
    beforeContentScroll.headerBottom === null ||
    beforeContentScroll.contentTop === null ||
    beforeContentScroll.contentTop < beforeContentScroll.headerBottom - 1
  ) {
    failures.push(
      `A área rolável começa por trás do cabeçalho: header=${beforeContentScroll.headerBottom}, conteúdo=${beforeContentScroll.contentTop}.`,
    );
  }
}

if (pageErrors.length > 0) failures.push(`Erros JavaScript: ${pageErrors.join(' | ')}`);
if (failedAssets.length > 0) {
  failures.push(`Requisições falharam: ${failedAssets.join(' | ')}`);
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}
