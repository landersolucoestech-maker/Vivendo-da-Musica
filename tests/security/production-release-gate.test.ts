import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = resolve(process.cwd(), 'scripts/assert-production-safe.mjs');

const runGate = (environment: Record<string, string>) => spawnSync(
  process.execPath,
  [script],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_PROJECT_REF: 'prodrefexample000001',
      VITE_DISABLE_AUTH: 'false',
      VITE_USE_MOCK_DATA: 'false',
      ...environment,
    },
    encoding: 'utf8',
  },
);

describe('gate de segurança para produção', () => {
  it('bloqueia qualquer tentativa de usar o projeto Supabase de desenvolvimento', () => {
    const result = runGate({ SUPABASE_PROJECT_REF: 'ywirfqvobfnunlcsnptm' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('SUPABASE_PROJECT_REF de produção aponta para o projeto dev');
  });

  it('bloqueia produção com bypass de autenticação ativo', () => {
    const result = runGate({ VITE_DISABLE_AUTH: 'true' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('VITE_DISABLE_AUTH não pode estar ativo em produção');
  });

  it('bloqueia produção com dados mockados ativos', () => {
    const result = runGate({ VITE_USE_MOCK_DATA: 'true' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('VITE_USE_MOCK_DATA não pode estar ativo em produção');
  });

  it('mantém o release bloqueado enquanto Edge Functions exclusivas do dev ainda existirem', () => {
    const result = runGate({});

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/referência explícita ao projeto dev|política.*demo.*anon/i);
  });
});
