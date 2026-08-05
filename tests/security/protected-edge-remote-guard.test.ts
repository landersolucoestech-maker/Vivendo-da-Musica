import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/protected-edge-smoke.yml'),
  'utf8',
);

const protectedFunctions = [
  'get-beat-download-url',
  'get-beat-license-contract',
  'get-course-certificate',
  'get-digital-product-download-url',
  'get-signed-lesson-url',
  'request-producer-payout',
  'validate-course-certificate',
];

describe('smoke remoto das Edge Functions protegidas', () => {
  it('executa no dev sem permissões de escrita', () => {
    expect(workflow).toContain('branches: [dev]');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('timeout-minutes: 5');
  });

  it('verifica todas as funções privadas versionadas', () => {
    for (const functionName of protectedFunctions) {
      expect(workflow).toContain(functionName);
    }
  });

  it('exige bloqueio HTTP 401 e resposta JSON sem usar credenciais', () => {
    expect(workflow).toContain("if status != '401'");
    expect(workflow).toContain('expected HTTP 401');
    expect(workflow).toContain("content-type: application/json");
    expect(workflow).toContain("payload.get('code') not in (401, '401')");
    expect(workflow).not.toContain('Authorization: Bearer');
    expect(workflow).not.toContain('secrets.');
  });
});
