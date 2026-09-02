import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const workflow = readProjectFile('.github/workflows/dev-pages-preview.yml');
const previewFunction = readProjectFile('supabase/functions/vivendo-preview/index.ts');

describe('contrato de publicação do preview do branch dev', () => {
  it('publica exclusivamente o branch dev no GitHub Pages sem branch técnica auxiliar', () => {
    expect(workflow).toContain('branches: [dev]');
    expect(workflow).toContain('ref: dev');
    expect(workflow).toContain('Deploy dev to GitHub Pages');
    expect(workflow).toContain('actions/deploy-pages@v5');
    expect(workflow).not.toContain('dev-preview-static');
    expect(workflow).not.toContain('push --force origin');
  });

  it('mantém autenticação desativada e roteamento navegável somente no preview', () => {
    expect(workflow).toContain('VITE_DISABLE_AUTH: "true"');
    expect(workflow).toContain('VITE_PREVIEW_MODE: "true"');
    expect(workflow).toContain('VITE_BASE_PATH: /Vivendo-da-Musica/');
    expect(workflow).toContain('VITE_ROUTER_MODE: hash');
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
  });

  it('marca o artefato com branch e SHA exatos do dev', () => {
    expect(workflow).toContain('vdm-preview-branch');
    expect(workflow).toContain('content="dev"');
    expect(workflow).toContain('vdm-preview-commit');
    expect(workflow).toContain("os.environ['GITHUB_SHA']");
  });

  it('usa apenas Actions de Pages compatíveis com o runtime atual', () => {
    expect(workflow).toContain('actions/configure-pages@v6');
    expect(workflow).toContain('actions/upload-pages-artifact@v5');
    expect(workflow).toContain('actions/deploy-pages@v5');
  });

  it('mantém o resolvedor Supabase apontando diretamente para o Pages do dev', () => {
    expect(previewFunction).toContain('const PREVIEW_BRANCH = "dev";');
    expect(previewFunction).toContain(
      'const PAGES_PREVIEW_URL = "https://landersolucoestech-maker.github.io/Vivendo-da-Musica/";'
    );
    expect(previewFunction).not.toContain('dev-preview-static');
    expect(previewFunction).not.toContain('api.github.com/repos');
    expect(previewFunction).not.toContain('GITHUB_TOKEN');
  });

  it('mantém o resolvedor público sem cache intermediário e com headers defensivos', () => {
    expect(previewFunction).toContain('"cache-control": "no-store, max-age=0"');
    expect(previewFunction).toContain('"referrer-policy": "no-referrer"');
    expect(previewFunction).toContain('"x-content-type-options": "nosniff"');
    expect(previewFunction).toContain('status: 307');
  });
});
