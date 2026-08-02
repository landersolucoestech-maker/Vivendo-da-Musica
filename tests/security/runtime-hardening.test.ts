import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('endurecimento do runtime', () => {
  it('não carrega scripts ou metadados de plataformas geradoras', () => {
    const html = readProjectFile('index.html');

    expect(html).not.toMatch(/gpteng|lovable\.dev|Lovable Generated Project|@lovable_dev/i);
    expect(html).toContain('lang="pt-BR"');
  });

  it('não mantém o lovable-tagger no build ou nas dependências', () => {
    const viteConfig = readProjectFile('vite.config.ts');
    const packageJson = readProjectFile('package.json');
    const packageLock = readProjectFile('package-lock.json');

    expect(viteConfig).not.toMatch(/lovable-tagger|componentTagger/i);
    expect(packageJson).not.toContain('lovable-tagger');
    expect(packageLock).not.toContain('lovable-tagger');
  });

  it('entrega headers essenciais e CSP no Nginx de produção', () => {
    const nginx = readProjectFile('infra/nginx/default.conf');

    expect(nginx).toContain('Content-Security-Policy');
    expect(nginx).toContain("frame-ancestors 'none'");
    expect(nginx).toContain("object-src 'none'");
    expect(nginx).toContain('X-Content-Type-Options "nosniff"');
    expect(nginx).toContain('X-Frame-Options "DENY"');
  });

  it('executa a imagem web de produção sem privilégios de root', () => {
    const dockerfile = readProjectFile('Dockerfile');

    expect(dockerfile).toContain('nginxinc/nginx-unprivileged');
    expect(dockerfile).toContain('--chown=nginx:nginx');
  });
});
