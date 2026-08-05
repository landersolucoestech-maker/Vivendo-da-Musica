import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/download-access/index.ts'),
  'utf8',
);

describe('hardening do acesso unificado a downloads', () => {
  it('limita e valida o corpo antes de consultar recursos', () => {
    expect(source).toContain('const MAX_REQUEST_BYTES = 16_384;');
    expect(source).toContain("request.headers.get('content-length')");
    expect(source).toContain('request.body.getReader()');
    expect(source).toContain('totalBytes > maxBytes');
    expect(source).toContain("reader.cancel('payload_too_large')");
    expect(source).toContain('error instanceof PayloadTooLargeError');
    expect(source).toContain('}, 413, origin);');
  });

  it('aceita somente JSON e objeto com identificadores estritos', () => {
    expect(source).toContain("!contentType.startsWith('application/json')");
    expect(source).toContain('Tipo de conteúdo não suportado.');
    expect(source).toContain('JSON.parse');
    expect(source).toContain("typeof parsed === 'object'");
    expect(source).toContain('!Array.isArray(parsed)');
    expect(source).toContain('UUID_PATTERN.test(id)');
    expect(source).toContain("['beat', 'product']");
    expect(source).toContain("['download', 'contract']");
  });

  it('exige sessão fora do projeto DEV e valida o token com Auth', () => {
    expect(source).toContain("authHeader.startsWith('Bearer ')");
    expect(source).toContain('userClient.auth.getUser()');
    expect(source).toContain('else if (!isDevProject)');
    expect(source).toContain('Autenticação obrigatória.');
  });

  it('restringe beats a buckets privados permitidos e compra ativa', () => {
    expect(source).toContain("new Set(['beat-masters', 'beat-stems'])");
    expect(source).toContain('BEAT_BUCKETS.has(data.storage_bucket)');
    expect(source).toContain("purchase.status !== 'active'");
    expect(source).toContain('purchase.buyer_id === authenticatedUserId');
    expect(source).toContain('purchase.beat.is_demo');
  });

  it('restringe produtos a pedidos pagos do proprietário ou recurso demo', () => {
    expect(source).toContain(".eq('product.orders.status', 'paid')");
    expect(source).toContain('product.orders.some');
    expect(source).toContain('order.buyer_id === authenticatedUserId');
    expect(source).toContain('product.is_demo');
  });

  it('mantém URLs assinadas curtas e materialização exclusiva para demo', () => {
    expect(source).toContain('createSignedUrl(data.storage_path, 300');
    expect(source).toContain('createSignedUrl(purchase.license.license_contract_path, 300');
    expect(source).toContain('&& demoAccess');
    expect(source).toContain('expiresIn: 300');
  });

  it('usa respostas não armazenáveis e headers defensivos', () => {
    expect(source).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(source).toContain("'Referrer-Policy': 'no-referrer'");
    expect(source).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(source).toContain('status: 204');
  });
});
