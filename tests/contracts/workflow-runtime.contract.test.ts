import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowRoot = resolve(process.cwd(), '.github/workflows');
const workflowFiles = readdirSync(workflowRoot)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => ({ name, content: readFileSync(resolve(workflowRoot, name), 'utf8') }));

const deprecatedActionRuntime = /(?:actions\/checkout@v[1-5]|actions\/setup-node@v[1-5]|actions\/upload-artifact@v[1-6]|actions\/configure-pages@v[1-5]|actions\/upload-pages-artifact@v[1-4]|actions\/deploy-pages@v[1-4]|docker\/login-action@v[1-3]|docker\/setup-buildx-action@v[1-3]|docker\/build-push-action@v[1-6])/;

describe('contrato dos workflows de CI e release', () => {
  it('não mantém actions conhecidas em runtimes anteriores ao Node.js 24', () => {
    const violations = workflowFiles
      .filter(({ content }) => deprecatedActionRuntime.test(content))
      .map(({ name }) => name);

    expect(violations).toEqual([]);
  });

  it('mantém a validação de produção sem bypass, mocks ou preview mode', () => {
    const release = workflowFiles.find(({ name }) => name === 'release.yml')?.content ?? '';

    expect(release).toContain("VITE_PREVIEW_MODE: 'false'");
    expect(release).toContain("if: ${{ inputs.environment == 'production' }}");
    expect(release).toContain('node scripts/assert-production-safe.mjs');
    expect(release).toContain('npm run audit:high');
    expect(release).toContain('npx playwright test tests/e2e/public.spec.ts');
    expect(release).not.toContain('npm audit --audit-level=high');
  });

  it('mantém os testes demonstrativos separados do guarda real de autenticação', () => {
    const quality = workflowFiles.find(({ name }) => name === 'quality.yml')?.content ?? '';

    expect(quality).toContain('e2e-preview:');
    expect(quality).toContain("VITE_PREVIEW_MODE: 'true'");
    expect(quality).toContain('e2e-auth-guard:');
    expect(quality).toContain("VITE_DISABLE_AUTH: 'false'");
    expect(quality).toContain('production build protects administrative routes');
  });
});
