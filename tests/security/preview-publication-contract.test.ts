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

  it('verifica que o commit publicado é exatamente o commit compilado', () => {
    expect(workflow).toContain('vdm-preview-commit');
    expect(workflow).toContain('raw.githubusercontent.com/${GITHUB_REPOSITORY}/${STATIC_BRANCH}/index.html');
    expect(workflow).toContain('Published preview verified for ${BUILD_SHA}.');
  });

  it('valida o resolvedor Supabase contra o commit remoto da branch estática', () => {
    expect(workflow).toContain('PREVIEW_HEALTH_URL: https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1/vivendo-preview?health=1');
    expect(workflow).toContain('git ls-remote');
    expect(workflow).toContain("payload.get('staticCommit') != expected_commit");
    expect(workflow).toContain('Supabase preview resolver verified for ${expected_commit}.');
  });
});
