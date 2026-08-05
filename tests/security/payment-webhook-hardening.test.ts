import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/payment-webhook/index.ts'),
  'utf8',
);

describe('hardening do webhook canônico de pagamentos', () => {
  it('mantém verificação Stripe com HMAC, comparação constante e janela temporal', () => {
    expect(source).toContain("{ name: 'HMAC', hash: 'SHA-256' }");
    expect(source).toContain('constantTimeEqual(signature, expected)');
    expect(source).toContain('> 300');
    expect(source).toContain('`${timestamp}.${payload}`');
  });

  it('rejeita configuração ou assinatura ausente antes de ler o corpo', () => {
    const secretCheck = source.indexOf("if (!webhookSecret)");
    const signatureCheck = source.indexOf("if (!signature)");
    const bodyRead = source.indexOf('readBodyWithLimit(request, MAX_WEBHOOK_BYTES)');

    expect(secretCheck).toBeGreaterThan(-1);
    expect(signatureCheck).toBeGreaterThan(secretCheck);
    expect(bodyRead).toBeGreaterThan(signatureCheck);
    expect(source).toContain("Webhook de pagamento não configurado.");
    expect(source).toContain("Assinatura não informada.");
  });

  it('limita o stream de entrada e retorna 413 quando excedido', () => {
    expect(source).toContain('const MAX_WEBHOOK_BYTES = 1_048_576;');
    expect(source).toContain("request.headers.get('content-length')");
    expect(source).toContain('request.body.getReader()');
    expect(source).toContain('totalBytes > maxBytes');
    expect(source).toContain("reader.cancel('payload_too_large')");
    expect(source).toContain('error instanceof PayloadTooLargeError');
    expect(source).toContain('}, 413);');
  });

  it('restringe o conteúdo a JSON válido', () => {
    expect(source).toContain("!contentType.startsWith('application/json')");
    expect(source).toContain('Tipo de conteúdo não suportado.');
    expect(source).toContain('JSON.parse(rawPayload)');
    expect(source).toContain("typeof parsed !== 'object'");
    expect(source).toContain('Array.isArray(parsed)');
  });

  it('mantém idempotência persistida antes de processar o evento', () => {
    expect(source).toContain(".eq('provider_event_id', event.id)");
    expect(source).toContain("existing?.status === 'processed'");
    expect(source).toContain("existing?.status === 'ignored'");
    expect(source).toContain("onConflict: 'provider,provider_event_id'");
    expect(source).toContain('payload_sha256: payloadHash');
  });

  it('não permite cache intermediário nem interpretação de conteúdo', () => {
    expect(source).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(source).toContain("'X-Content-Type-Options': 'nosniff'");
  });
});
