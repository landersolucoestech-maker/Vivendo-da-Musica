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

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  if (['script', 'stylesheet', 'document'].includes(request.resourceType())) {
    failedAssets.push(
      `${request.resourceType()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`,
    );
  }
});

try {
  const response = await page.goto(previewUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  });

  await page.locator('.vdm-page').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(2_000);

  const home = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body.innerText.trim(),
    rootChildCount: document.querySelector('#root')?.childElementCount ?? 0,
    homeCount: document.querySelectorAll('.vdm-page').length,
    scriptCount: Array.from(document.scripts).filter((script) => Boolean(script.src)).length,
    stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length,
    commit: document.querySelector('meta[name="vdm-preview-commit"]')?.getAttribute('content') ?? '',
  }));

  await page.evaluate(() => {
    window.location.hash = '#/academia';
  });
  await page.waitForFunction(() => window.location.hash === '#/academia', undefined, {
    timeout: 10_000,
  });
  await page.waitForFunction(
    () => !document.body.innerText.includes('ERRO 404') && document.body.innerText.trim().length > 100,
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1_000);

  const academy = await page.evaluate(() => ({
    hash: window.location.hash,
    bodyText: document.body.innerText.trim(),
    rootChildCount: document.querySelector('#root')?.childElementCount ?? 0,
  }));

  await page.screenshot({ path: 'artifacts/preview-audit/home.png', fullPage: true });

  const report = {
    url: previewUrl,
    status: response?.status() ?? 0,
    home: { ...home, bodyTextLength: home.bodyText.length },
    academy: { ...academy, bodyTextLength: academy.bodyText.length },
    pageErrors,
    failedAssets,
    consoleErrors,
  };
  await writeFile('artifacts/preview-audit/report.json', JSON.stringify(report, null, 2));

  const failures = [];
  if (report.status !== 200) failures.push(`HTTP ${report.status}`);
  if (home.commit !== buildSha) failures.push(`Build inesperado: ${home.commit}`);
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
  if (
    academy.hash !== '#/academia' ||
    academy.rootChildCount === 0 ||
    academy.bodyText.length < 100 ||
    academy.bodyText.includes('ERRO 404')
  ) {
    failures.push('A rota pública /academia não foi renderizada.');
  }
  if (pageErrors.length > 0) failures.push(`Erros JavaScript: ${pageErrors.join(' | ')}`);
  if (failedAssets.length > 0) {
    failures.push(`Assets críticos falharam: ${failedAssets.join(' | ')}`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) throw new Error(failures.join('\n'));
} finally {
  await browser.close();
}
