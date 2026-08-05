import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/service-edge-smoke.yml'),
  'utf8',
);

const serviceFunctions = [
  'manage-service-catalog',
  'manage-service-requests',
  'service-delivery-file-access',
];

describe('smoke remoto das Edge Functions de serviços', () => {
  it('executa no dev com acesso somente de leitura ao repositório', () => {
    expect(workflow).toContain('branches: [dev]');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('timeout-minutes: 8');
    expect(workflow).not.toContain('secrets.');
  });

  it('verifica as três funções de serviços publicadas', () => {
    for (const functionName of serviceFunctions) {
      expect(workflow).toContain(functionName);
    }
    expect(workflow).toContain('FUNCTIONS_BASE_URL: https://ywirfqvobfnunlcsnptm.supabase.co/functions/v1');
  });

  it('prova métodos, origem, tipo de conteúdo, autenticação e limite de corpo', () => {
    expect(workflow).toContain("method 405 'Método não permitido.'");
    expect(workflow).toContain("origin 403 'Origem não autorizada.'");
    expect(workflow).toContain("content-type 415 'Tipo de conteúdo não suportado.'");
    expect(workflow).toContain("authentication 401 'Autenticação obrigatória.'");
    expect(workflow).toContain("payload-limit 413 'Payload excede o limite permitido.'");
    expect(workflow).toContain("'a' * 65_536");
  });

  it('exige headers defensivos em todos os cenários', () => {
    expect(workflow).toContain("r'^cache-control: no-store, max-age=0\\r?$'");
    expect(workflow).toContain("r'^content-type: application/json; charset=utf-8\\r?$'");
    expect(workflow).toContain("r'^referrer-policy: no-referrer\\r?$'");
    expect(workflow).toContain("r'^x-content-type-options: nosniff\\r?$'");
  });

  it('não usa credenciais ou payloads capazes de alterar dados', () => {
    expect(workflow).not.toContain('Authorization: Bearer');
    expect(workflow).not.toContain('actingUserId');
    expect(workflow).not.toContain('save_listing');
    expect(workflow).not.toContain('create_request');
    expect(workflow).not.toContain('create_upload');
    expect(workflow).toContain('service-delivery-file-access');
    expect(workflow).toContain('create_download');
  });
});
