import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/functions/api-v1/index.ts'),
  'utf8',
);
const shared = readFileSync(
  resolve(process.cwd(), 'supabase/functions/_shared/api.ts'),
  'utf8',
);

describe('hardening da API pública v1', () => {
  it('limita webhooks por bytes antes da validação criptográfica', () => {
    expect(source).toContain('const MAX_WEBHOOK_BYTES = 1_048_576;');
    expect(source).toContain('req.body.getReader()');
    expect(source).toContain('totalBytes > maxBytes');
    expect(source).toContain('reader.cancel("payload_too_large")');
    expect(source).toContain('error instanceof PayloadTooLargeError');
    expect(source).toContain('413, "PAYLOAD_TOO_LARGE"');
    expect(source).not.toContain('const rawBody = await req.text()');
  });

  it('exige configuração, headers e JSON antes de aceitar o webhook', () => {
    const secretCheck = source.indexOf('if (!secret)');
    const headerCheck = source.indexOf('INVALID_WEBHOOK_HEADERS');
    const contentTypeCheck = source.indexOf('UNSUPPORTED_MEDIA_TYPE');
    const bodyRead = source.indexOf('readTextWithLimit(req, MAX_WEBHOOK_BYTES)');

    expect(secretCheck).toBeGreaterThan(-1);
    expect(headerCheck).toBeGreaterThan(secretCheck);
    expect(contentTypeCheck).toBeGreaterThan(headerCheck);
    expect(bodyRead).toBeGreaterThan(contentTypeCheck);
    expect(source).toContain('contentType.startsWith("application/json")');
  });

  it('mantém HMAC, comparação constante e JSON objeto obrigatório', () => {
    expect(source).toContain('hmacSha256(secret, rawBody)');
    expect(source).toContain('secureEqual(supplied, expected)');
    expect(source).toContain('JSON.parse(rawBody)');
    expect(source).toContain('typeof parsed !== "object"');
    expect(source).toContain('Array.isArray(parsed)');
    expect(source).toContain('Webhook payload must be a JSON object');
  });

  it('persiste apenas hash e metadados compatíveis com webhook_receipts', () => {
    expect(source).toContain('payload_hash: payloadHash');
    expect(source).toContain('external_event_id: eventId');
    expect(source).toContain('event_type: eventType');
    expect(source).not.toContain('payload: parsedPayload');
    expect(source).toContain('error?.code === "23505"');
    expect(source).toContain('duplicate: true');
  });

  it('usa um salt secreto e prioriza IP fornecido pela infraestrutura', () => {
    expect(source).toContain('req.headers.get("cf-connecting-ip")');
    expect(source).toContain('req.headers.get("x-real-ip")');
    expect(source).toContain('Deno.env.get("RATE_LIMIT_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).not.toContain('RATE_LIMIT_SALT") ?? "api-v1"');
    expect(source).toContain('routeKey.startsWith("webhooks:") ? 120 : 60');
  });

  it('mantém paginação, ordenação e pesquisa limitadas', () => {
    expect(source).toContain('q.replace(/[%_,()]/g, "")');
    expect(source).toContain('new Set([config.defaultSort, "created_at", "updated_at", "title"])');
    expect(shared).toContain('rawLimit > 100');
    expect(shared).toContain('Cache-Control');
    expect(shared).toContain('X-Content-Type-Options');
  });
});
