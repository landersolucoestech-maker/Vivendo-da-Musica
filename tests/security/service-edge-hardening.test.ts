import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const helper = read('supabase/functions/_shared/serviceEndpoint.ts');
const catalog = read('supabase/functions/manage-service-catalog/index.ts');
const requests = read('supabase/functions/manage-service-requests/index.ts');
const delivery = read('supabase/functions/service-delivery-file-access/index.ts');
const endpoints = [catalog, requests, delivery];

describe('hardening das Edge Functions de serviços', () => {
  it('limita corpos JSON a 64 KiB antes de materializá-los', () => {
    expect(helper).toContain('MAX_SERVICE_JSON_BYTES = 65_536');
    expect(helper).toContain("request.headers.get('content-length')");
    expect(helper).toContain('request.body.getReader()');
    expect(helper).toContain('totalBytes > maxBytes');
    expect(helper).toContain("reader.cancel('payload_too_large')");
    expect(helper).toContain('error instanceof PayloadTooLargeError');
    expect(helper).toContain('}, 413, origin);');
  });

  it('mantém allowlist de origem, localhost DEV e respostas defensivas', () => {
    expect(helper).toContain("Deno.env.get('ALLOWED_ORIGINS')");
    expect(helper).toContain("Deno.env.get('DEV_ALLOWED_ORIGINS')");
    expect(helper).toContain("parsed.protocol === 'http:'");
    expect(helper).toContain("'localhost'");
    expect(helper).toContain("'127.0.0.1'");
    expect(helper).toContain('.includes(parsed.hostname)');
    expect(helper).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(helper).toContain("'Referrer-Policy': 'no-referrer'");
    expect(helper).toContain("'X-Content-Type-Options': 'nosniff'");
    expect(helper).toContain("'Access-Control-Allow-Methods': 'POST, OPTIONS'");
  });

  it('exige application/json e um objeto JSON', () => {
    expect(helper).toContain("contentType.startsWith('application/json')");
    expect(helper).toContain('Array.isArray(parsed)');
    expect(helper).toContain("'O corpo deve ser um objeto JSON.'");
    expect(helper).toContain("'JSON inválido.'");
  });

  it('obriga os três endpoints a usar o helper compartilhado', () => {
    for (const endpoint of endpoints) {
      expect(endpoint).toContain('resolveServiceOrigin(request)');
      expect(endpoint).toContain('readServiceJsonObject(request, origin)');
      expect(endpoint).toContain('serviceOptions(origin)');
      expect(endpoint).toContain('serviceReply');
      expect(endpoint).not.toContain('request.json()');
      expect(endpoint).not.toMatch(/serviceReply\(\{ error: error(?:\?\.message|\.message)/);
    }
  });

  it('preserva o bypass apenas para perfis demo no projeto DEV', () => {
    for (const endpoint of endpoints) {
      expect(endpoint).toContain("const DEV_REF = 'ywirfqvobfnunlcsnptm'");
      expect(endpoint).toContain(".eq('is_demo', true)");
      expect(endpoint).toContain('actorIsDemo');
    }
  });

  it('mantém catálogo restrito ao prestador e ao mesmo ambiente', () => {
    expect(catalog).toContain(".eq('provider_id', userId)");
    expect(catalog).toContain(".eq('is_demo', actorIsDemo)");
    expect(catalog).toContain("['producer', 'instructor']");
    expect(catalog).toContain('Number.isSafeInteger(body.priceCents)');
    expect(catalog).not.toContain('error?.message');
  });

  it('mantém solicitações e propostas isoladas entre demo e dados reais', () => {
    expect(requests).toContain('Boolean(listing.is_demo) !== actorIsDemo');
    expect(requests).toContain('Boolean(serviceRequest.is_demo) !== actorIsDemo');
    expect(requests).toContain(".eq('is_demo', actorIsDemo)");
    expect(requests).toContain("service_accept_service_proposal");
    expect(requests).not.toContain('error?.message');
  });

  it('valida uploads e caminhos de entrega antes de emitir URLs assinadas', () => {
    expect(delivery).toContain('MAX_FILE_SIZE = 1_073_741_824');
    expect(delivery).toContain('MAX_PATH_LENGTH = 1_024');
    expect(delivery).toContain("segment === '.' || segment === '..'");
    expect(delivery).toContain("value.includes('\\\\')");
    expect(delivery).toContain('Number.isSafeInteger(body.sizeBytes)');
    expect(delivery).toContain('ALLOWED_MIME_TYPES.has(contentType)');
    expect(delivery).toContain('Boolean(contract.is_demo) !== actorIsDemo');
    expect(delivery).not.toContain('error?.message');
  });
});
