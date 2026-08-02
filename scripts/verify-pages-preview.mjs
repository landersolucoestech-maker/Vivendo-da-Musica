import { chromium } from '@playwright/test';

const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  throw new Error('PREVIEW_URL is required.');
}

const baseUrl = new URL(previewUrl);
const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
const routes = [
  { path: '', name: 'home', requireOkStatus: true },
  { path: 'login', name: 'login' },
  { path: 'contato', name: 'contact' },
  { path: 'academia', name: 'academy' },
  { path: 'marketplace', name: 'marketplace' },
  { path: '__preview-route-not-found__', name: 'spa-not-found' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: false,
});

const failures = [];
const warnings = [];

try {
  for (const route of routes) {
    const page = await context.newPage();
    const pageErrors = [];
    const failedAssets = [];
    const consoleErrors = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('requestfailed', (request) => {
      const requestUrl = new URL(request.url());
      const resourceType = request.resourceType();
      const isFirstParty = requestUrl.origin === baseUrl.origin && requestUrl.pathname.startsWith(basePath);
      const isCriticalAsset = ['document', 'script', 'stylesheet'].includes(resourceType);

      if (isFirstParty && isCriticalAsset) {
        failedAssets.push(`${resourceType} ${request.url()} — ${request.failure()?.errorText ?? 'request failed'}`);
      }
    });

    page.on('response', (response) => {
      const responseUrl = new URL(response.url());
      const resourceType = response.request().resourceType();
      const isFirstParty = responseUrl.origin === baseUrl.origin && responseUrl.pathname.startsWith(basePath);
      const isCriticalAsset = ['script', 'stylesheet'].includes(resourceType);

      if (isFirstParty && isCriticalAsset && response.status() >= 400) {
        failedAssets.push(`${resourceType} ${response.url()} — HTTP ${response.status()}`);
      }
    });

    const url = new URL(route.path, previewUrl).toString();
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });

    const status = response?.status() ?? 0;

    if (route.requireOkStatus && status !== 200) {
      failures.push(`${route.name}: expected HTTP 200, received ${status || 'no response'}.`);
    } else if (!route.requireOkStatus && ![200, 404].includes(status)) {
      failures.push(`${route.name}: expected HTTP 200 or GitHub Pages SPA fallback 404, received ${status || 'no response'}.`);
    } else if (status === 404) {
      warnings.push(`${route.name}: GitHub Pages served the SPA through 404.html, as expected for a direct deep link.`);
    }

    await page.waitForFunction(
      () => {
        const root = document.querySelector('#root');
        return Boolean(root && root.childElementCount > 0);
      },
      undefined,
      { timeout: 30_000 },
    );

    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {
      warnings.push(`${route.name}: network did not become idle within 12 seconds; continuing with DOM validation.`);
    });

    const snapshot = await page.evaluate(() => ({
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      rootChildCount: document.querySelector('#root')?.childElementCount ?? 0,
      scripts: Array.from(document.scripts)
        .map((script) => script.src)
        .filter(Boolean),
      stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((link) => link.href)
        .filter(Boolean),
    }));

    if (snapshot.rootChildCount === 0 || snapshot.bodyTextLength === 0) {
      failures.push(`${route.name}: React root rendered no visible content.`);
    }

    if (route.name === 'home' && (snapshot.scripts.length === 0 || snapshot.stylesheets.length === 0)) {
      failures.push('home: expected at least one JavaScript bundle and one stylesheet.');
    }

    if (pageErrors.length > 0) {
      failures.push(`${route.name}: uncaught page errors: ${pageErrors.join(' | ')}`);
    }

    if (failedAssets.length > 0) {
      failures.push(`${route.name}: first-party asset failures: ${failedAssets.join(' | ')}`);
    }

    if (consoleErrors.length > 0) {
      warnings.push(`${route.name}: browser console errors observed: ${consoleErrors.join(' | ')}`);
    }

    console.log(
      JSON.stringify(
        {
          route: route.name,
          url,
          status,
          title: snapshot.title,
          bodyTextLength: snapshot.bodyTextLength,
          rootChildCount: snapshot.rootChildCount,
          scriptCount: snapshot.scripts.length,
          stylesheetCount: snapshot.stylesheets.length,
          pageErrors,
          failedAssets,
          consoleErrors,
        },
        null,
        2,
      ),
    );

    await page.close();
  }
} finally {
  await context.close();
  await browser.close();
}

for (const warning of warnings) {
  console.warn(`WARNING: ${warning}`);
}

if (failures.length > 0) {
  throw new Error(`Live Pages verification failed:\n- ${failures.join('\n- ')}`);
}

console.log(`Live Pages verification passed for ${previewUrl}`);
