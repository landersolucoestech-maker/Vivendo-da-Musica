import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const workflow = readProjectFile('.github/workflows/dev-pages-preview.yml');
const previewFunction = readProjectFile('supabase/functions/vivendo-preview/index.ts');

describe('contrato de publicação do preview estático', () => {
  it('mantém o publicador e o resolvedor alinhados na mesma branch técnica', () => {
    expect(workflow).toContain('STATIC_BRANCH: dev-preview-static');
    expect(workflow).toContain('HEAD:refs/heads/${STATIC_BRANCH}');
    expect(previewFunction).toContain('const STATIC_BRANCH = "dev-preview-static";');
  });

  it('publica somente o build compilado em um histórico órfão', () => {
    expect(workflow).toContain('publish_dir="$(mktemp -d)"');
    expect(workflow).toContain('cp -a dist/. "$publish_dir"/');
    expect(workflow).toContain('init --initial-branch="$STATIC_BRANCH"');
    expect(workflow).toContain('push --force origin');
    expect(workflow).not.toContain('Delete dev-preview-static if present');
  });

  it('impede source maps e marcadores de segredo no artefato público', () => {
    expect(workflow).toContain("find dist -type f -name '*.map'");
    expect(workflow).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).toContain('STRIPE_[A-Z_]*SECRET');
    expect(workflow).toContain('PRIVATE KEY');
  });

  it('bloqueia indexação do ambiente de desenvolvimento', () => {
    expect(workflow).toContain('<meta name="robots" content="noindex, nofollow, noarchive" />');
    expect(workflow).toContain('<meta name="googlebot" content="noindex, nofollow, noarchive" />');
    expect(workflow).toContain("Path('dist/robots.txt').write_text('User-agent: *\\nDisallow: /\\n'");
    expect(workflow).toContain("grep --quiet '^Disallow: /$' dist/robots.txt");
    expect(workflow).toContain('contains ${BUILD_SHA} and blocks indexing');
  });

  it('verifica o build por uma URL imutável baseada no SHA publicado', () => {
    expect(workflow).toContain('vdm-preview-commit');
    expect(workflow).toContain('PUBLISHED_COMMIT=${published_commit}');
    expect(workflow).toContain('raw.githubusercontent.com/${GITHUB_REPOSITORY}/${published_commit}');
    expect(workflow).toContain('Immutable preview commit ${published_commit} contains ${BUILD_SHA}');
  });

  it('valida o resolvedor Supabase contra o commit remoto da branch estática', () => {
    expect(workflow).toContain('PREVIEW_HEALTH_URL: https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1/vivendo-preview?health=1');
    expect(workflow).toContain('git ls-remote');
    expect(workflow).toContain("payload.get('staticCommit') != expected_commit");
    expect(workflow).toContain('Supabase preview resolver verified for ${PUBLISHED_COMMIT}.');
  });

  it('valida a API v1 publicada, seu roteamento e headers de rastreabilidade', () => {
    expect(workflow).toContain('API_V1_HEALTH_URL: https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1/api-v1/v1/health');
    expect(workflow).toContain('Verify remote API v1 health');
    expect(workflow).toContain("data.get('status') != 'healthy'");
    expect(workflow).toContain("data.get('version') != '1'");
    expect(workflow).toContain("r'^x-request-id: [0-9a-f-]{36}\\r?$'");
    expect(workflow).toContain("r'^x-trace-id: [0-9a-f-]{36}\\r?$'");
    expect(workflow).toContain("r'^x-api-version: 1\\r?$'");
    expect(workflow).toContain("r'^x-content-type-options: nosniff\\r?$'");
    expect(workflow).toContain('Remote API v1 health verified.');
  });

  it('valida os guards remotos dos webhooks Stripe sem processar eventos', () => {
    expect(workflow).toContain('STRIPE_BEAT_WEBHOOK_URL: https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1/stripe-beat-webhook');
    expect(workflow).toContain('STRIPE_DIGITAL_PRODUCT_WEBHOOK_URL: https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1/stripe-digital-product-webhook');
    expect(workflow).toContain('Verify remote Stripe webhook guards');
    expect(workflow).toContain("if status != '405'");
    expect(workflow).toContain("payload.get('error') != 'Método não permitido.'");
    expect(workflow).toContain("r'^cache-control: no-store, max-age=0\\r?$'");
    expect(workflow).toContain("r'^content-type: application/json; charset=utf-8\\r?$'");
    expect(workflow).toContain("r'^x-content-type-options: nosniff\\r?$'");
    expect(workflow).toContain('Stripe webhook guard verified.');
  });

  it('limita consultas públicas ao GitHub e tolera indisponibilidade transitória', () => {
    expect(previewFunction).toContain('const STATIC_COMMIT_TTL_MS = 60_000;');
    expect(previewFunction).toContain('let staticCommitCache: StaticCommitCache | null = null;');
    expect(previewFunction).toContain('let staticCommitRefresh: Promise<string> | null = null;');
    expect(previewFunction).toContain('staticCommitCache.expiresAt > now');
    expect(previewFunction).toContain('if (!staticCommitRefresh)');
    expect(previewFunction).toContain('usando o último commit estático conhecido');
    expect(previewFunction).toContain('Deno.env.get("GITHUB_TOKEN")');
    expect(previewFunction).toContain('AbortSignal.timeout(10_000)');
  });

  it('mantém respostas públicas sem cache intermediário e com headers defensivos', () => {
    expect(previewFunction).toContain('"cache-control": "no-store, max-age=0"');
    expect(previewFunction).toContain('"referrer-policy": "no-referrer"');
    expect(previewFunction).toContain('"x-content-type-options": "nosniff"');
    expect(previewFunction).toContain('status: 307');
  });
});
