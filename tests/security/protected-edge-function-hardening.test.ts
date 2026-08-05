import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const helper = read('supabase/functions/_shared/protectedEndpoint.ts');
const sources = {
  beatDownload: read('supabase/functions/get-beat-download-url/index.ts'),
  beatContract: read('supabase/functions/get-beat-license-contract/index.ts'),
  courseCertificate: read('supabase/functions/get-course-certificate/index.ts'),
  digitalDownload: read('supabase/functions/get-digital-product-download-url/index.ts'),
  lessonDownload: read('supabase/functions/get-signed-lesson-url/index.ts'),
  producerPayout: read('supabase/functions/request-producer-payout/index.ts'),
};

const protectedSources = Object.values(sources);

describe('hardening das Edge Functions protegidas por JWT', () => {
  it('limita JSON autenticado a 16 KiB por stream', () => {
    expect(helper).toContain('MAX_PROTECTED_JSON_BYTES = 16_384');
    expect(helper).toContain('request.headers.get("content-length")');
    expect(helper).toContain('request.body.getReader()');
    expect(helper).toContain('totalBytes > maxBytes');
    expect(helper).toContain('reader.cancel("payload_too_large")');
    expect(helper).toContain('error instanceof PayloadTooLargeError');
    expect(helper).toContain('}, 413);');
  });

  it('exige objeto JSON e devolve respostas privadas com headers defensivos', () => {
    expect(helper).toContain('contentType.startsWith("application/json")');
    expect(helper).toContain('Array.isArray(parsed)');
    expect(helper).toContain('"Cache-Control": "no-store, max-age=0"');
    expect(helper).toContain('"Referrer-Policy": "no-referrer"');
    expect(helper).toContain('"X-Content-Type-Options": "nosniff"');
    expect(helper).toContain('"Access-Control-Allow-Methods": "POST, OPTIONS"');
  });

  it('obriga todas as rotas privadas mutáveis a usar o helper compartilhado', () => {
    for (const source of protectedSources) {
      expect(source).toContain('readProtectedJsonObject(request)');
      expect(source).toContain('protectedOptions()');
      expect(source).toContain('protectedJson');
      expect(source).not.toContain('req.json()');
      expect(source).not.toContain('request.json()');
      expect(source).not.toContain('error instanceof Error ? error.message');
    }
  });

  it('mantém downloads de beat restritos ao comprador com licença ativa', () => {
    expect(sources.beatDownload).toContain('purchase.buyer_id !== userId');
    expect(sources.beatDownload).toContain('purchase.status !== "active"');
    expect(sources.beatDownload).toContain('delivery.expires_at');
    expect(sources.beatDownload).toContain('SIGNED_URL_TTL_SECONDS = 60');
  });

  it('mantém contratos de beat restritos ao comprador e licença ativa', () => {
    expect(sources.beatContract).toContain('purchase.buyer_id !== userId');
    expect(sources.beatContract).toContain('purchase.status !== "active"');
    expect(sources.beatContract).toContain('document_download_count');
    expect(sources.beatContract).toContain('"Cache-Control": "private, no-store, max-age=0"');
  });

  it('mantém certificados restritos ao aluno ou administradores e bloqueia revogados', () => {
    expect(sources.courseCertificate).toContain('certificate.user_id !== userId');
    expect(sources.courseCertificate).toContain('["admin", "super_admin"]');
    expect(sources.courseCertificate).toContain('certificate.revoked_at');
    expect(sources.courseCertificate).toContain('"Cache-Control": "private, no-store, max-age=0"');
  });

  it('mantém produtos digitais restritos a compras pagas do usuário', () => {
    expect(sources.digitalDownload).toContain('digital_product_orders.buyer_id", userId');
    expect(sources.digitalDownload).toContain('digital_product_orders.status", "paid"');
    expect(sources.digitalDownload).toContain('SIGNED_URL_TTL_SECONDS = 60');
    expect(sources.digitalDownload).toContain('UUID_PATTERN.test(fileId)');
  });

  it('mantém arquivos de aula autorizados pelo cliente RLS do usuário', () => {
    expect(sources.lessonDownload).toContain('supabaseUserClient');
    expect(sources.lessonDownload).toContain('.from("lesson_files")');
    expect(sources.lessonDownload).toContain('UUID_PATTERN.test(lessonId)');
    expect(sources.lessonDownload).toContain('SIGNED_URL_TTL_SECONDS = 60 * 5');
  });

  it('mantém saques vinculados ao produtor autenticado e idempotentes', () => {
    expect(sources.producerPayout).toContain('target_producer_id: userId');
    expect(sources.producerPayout).toContain('request_idempotency_key: idempotencyKey');
    expect(sources.producerPayout).toContain('IDEMPOTENCY_PATTERN');
    expect(sources.producerPayout).not.toContain('return protectedJson({ error: error.message }');
  });
});
