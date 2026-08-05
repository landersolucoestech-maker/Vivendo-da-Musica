import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const shared = read('supabase/functions/_shared/stripeWebhook.ts');
const beat = read('supabase/functions/stripe-beat-webhook/index.ts');
const digital = read('supabase/functions/stripe-digital-product-webhook/index.ts');

describe('hardening compartilhado dos webhooks Stripe', () => {
  it('limita a entrada por bytes antes de materializar o payload', () => {
    expect(shared).toContain('MAX_STRIPE_WEBHOOK_BYTES = 1_048_576');
    expect(shared).toContain("request.headers.get('content-length')");
    expect(shared).toContain('request.body.getReader()');
    expect(shared).toContain('totalBytes > maxBytes');
    expect(shared).toContain("reader.cancel('payload_too_large')");
    expect(shared).toContain('error instanceof PayloadTooLargeError');
    expect(shared).toContain('}, 413);');
  });

  it('exige configuração, assinatura e JSON antes da leitura do corpo', () => {
    const secretCheck = shared.indexOf('if (!secret)');
    const signatureCheck = shared.indexOf('if (!signature)');
    const contentTypeCheck = shared.indexOf("!contentType.startsWith('application/json')");
    const bodyRead = shared.indexOf('readTextWithLimit(request, MAX_STRIPE_WEBHOOK_BYTES)');

    expect(secretCheck).toBeGreaterThan(-1);
    expect(signatureCheck).toBeGreaterThan(secretCheck);
    expect(contentTypeCheck).toBeGreaterThan(signatureCheck);
    expect(bodyRead).toBeGreaterThan(contentTypeCheck);
  });

  it('mantém HMAC Stripe, comparação constante e janela temporal de cinco minutos', () => {
    expect(shared).toContain("{ name: 'HMAC', hash: 'SHA-256' }");
    expect(shared).toContain('constantTimeEqual(candidate, expected)');
    expect(shared).toContain('> 300');
    expect(shared).toContain('`${rawTimestamp}.${payload}`');
    expect(shared).toContain('HEX_SIGNATURE_PATTERN');
  });

  it('valida estruturalmente o evento e devolve respostas defensivas', () => {
    expect(shared).toContain('JSON.parse(rawPayload)');
    expect(shared).toContain('EVENT_ID_PATTERN');
    expect(shared).toContain('EVENT_TYPE_PATTERN');
    expect(shared).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(shared).toContain("'X-Content-Type-Options': 'nosniff'");
  });

  it('obriga os dois endpoints a usar o verificador compartilhado', () => {
    for (const source of [beat, digital]) {
      expect(source).toContain('readVerifiedStripeWebhook(request');
      expect(source).toContain('stripeWebhookJson');
      expect(source).not.toContain('request.text()');
      expect(source).not.toContain('req.text()');
      expect(source).not.toContain('JSON.parse(');
    }
  });

  it('reconcilia integralmente pagamentos de beat e preserva reversões idempotentes', () => {
    expect(beat).toContain('readPositiveSafeInteger(object.amount)');
    expect(beat).toContain('normalizeCurrency(object.currency)');
    expect(beat).toContain('provider_event: event.id');
    expect(beat).toContain('reverse_beat_order_ledger');
    expect(beat).toContain('providerSessionId !== order.provider_session_id');
    expect(beat).toContain('amountCents !== Number(order.amount_cents)');
    expect(beat).toContain('currency !== String(order.currency).toUpperCase()');
    expect(beat).toContain('if (cancelError)');
  });

  it('isola pedidos digitais e reconcilia sessão, pagamento, valor e moeda', () => {
    expect(digital).toContain('orderKind !== "digital_product"');
    expect(digital).toContain('UUID_PATTERN.test(orderId)');
    expect(digital).toContain('readNestedId(object.payment_intent)');
    expect(digital).toContain('providerSessionId !== order.provider_session_id');
    expect(digital).toContain('amountCents !== Number(order.amount_cents)');
    expect(digital).toContain('currency !== String(order.currency).toUpperCase()');
    expect(digital).toContain('mark_digital_product_order_paid');
    expect(digital).toContain('if (cancelError)');
  });
});
