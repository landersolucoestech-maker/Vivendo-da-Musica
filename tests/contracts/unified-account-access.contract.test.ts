import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('contrato do acesso unificado por tipo de conta', () => {
  it('mantém somente Entrar e Criar conta como ações públicas de acesso', () => {
    const navigation = readProjectFile('src/shared/components/Navigation.tsx');

    expect(navigation).toContain('>Entrar</Link>');
    expect(navigation).toContain('>Criar conta</Button>');
    expect(navigation).not.toMatch(/Sou empresa/i);
  });

  it('mantém login e cadastro como invólucros da mesma estrutura reutilizável', () => {
    const login = readProjectFile('src/modules/auth/pages/Login.tsx');
    const register = readProjectFile('src/modules/auth/pages/Register.tsx');

    expect(login).toContain('UnifiedAuthPage mode="login"');
    expect(register).toContain('UnifiedAuthPage mode="register"');
    expect(login).not.toMatch(/<form/i);
    expect(register).not.toMatch(/<form/i);
  });

  it('oferece exatamente os cinco perfis públicos definidos para acesso', () => {
    const profiles = readProjectFile('src/modules/auth/data/accountProfiles.ts');
    const profileValues = [...profiles.matchAll(/value:\s*'(student|producer|instructor|company|affiliate)'/g)]
      .map((match) => match[1]);

    expect(profileValues).toEqual(['student', 'producer', 'instructor', 'company', 'affiliate']);
    expect(new Set(profileValues).size).toBe(5);
  });

  it('preserva o redirecionamento legado empresarial para o cadastro unificado', () => {
    const app = readProjectFile('src/App.tsx');

    expect(app).toContain('ROUTES.companyRegister');
    expect(app).toContain('ROUTES.register}?perfil=empresa');
  });
});
