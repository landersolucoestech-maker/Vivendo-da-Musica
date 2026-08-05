export const MAX_STRIPE_WEBHOOK_BYTES = 1_048_576;

const encoder = new TextEncoder();
const HEX_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;
const EVENT_ID_PATTERN = /^evt_[A-Za-z0-9_]{3,250}$/;
const EVENT_TYPE_PATTERN = /^[a-z0-9_.]{3,120}$/;

export interface StripeEvent {
  id: string;
  type: string;
  created?: number;
  data: {
    object: Record<string, unknown>;
  };
}

class PayloadTooLargeError extends Error {}

const responseHeaders: HeadersInit = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

export const stripeWebhookJson = (body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: responseHeaders },
);

const bytesToHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const hmacSha256 = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
};

const verifyStripeSignature = async (payload: string, header: string, secret: string) => {
  const fields = header.split(',').map((item) => item.trim().split('=', 2));
  const rawTimestamp = fields.find(([key]) => key === 't')?.[1] ?? '';
  const timestamp = Number(rawTimestamp);
  const signatures = fields
    .filter(([key, value]) => key === 'v1' && typeof value === 'string' && HEX_SIGNATURE_PATTERN.test(value))
    .map(([, value]) => value.toLowerCase());

  if (!Number.isInteger(timestamp) || timestamp <= 0 || !signatures.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const expected = await hmacSha256(secret, `${rawTimestamp}.${payload}`);
  return signatures.some((candidate) => constantTimeEqual(candidate, expected));
};

const readTextWithLimit = async (request: Request, maxBytes: number) => {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PayloadTooLargeError('Payload excede o limite permitido.');
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('payload_too_large');
        throw new PayloadTooLargeError('Payload excede o limite permitido.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
};

const resolveSecret = (secretNames: readonly string[]) => {
  for (const name of secretNames) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
};

const parseEvent = (rawPayload: string): StripeEvent | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;
  const data = candidate.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const object = (data as Record<string, unknown>).object;
  if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
  if (typeof candidate.id !== 'string' || !EVENT_ID_PATTERN.test(candidate.id)) return null;
  if (typeof candidate.type !== 'string' || !EVENT_TYPE_PATTERN.test(candidate.type)) return null;

  return {
    id: candidate.id,
    type: candidate.type,
    created: typeof candidate.created === 'number' && Number.isSafeInteger(candidate.created)
      ? candidate.created
      : undefined,
    data: { object: object as Record<string, unknown> },
  };
};

export type VerifiedStripeWebhook = {
  event: StripeEvent;
  object: Record<string, unknown>;
};

export const readVerifiedStripeWebhook = async (
  request: Request,
  secretNames: readonly string[],
): Promise<VerifiedStripeWebhook | Response> => {
  if (request.method !== 'POST') {
    return stripeWebhookJson({ error: 'Método não permitido.' }, 405);
  }

  const secret = resolveSecret(secretNames);
  if (!secret) {
    return stripeWebhookJson({ error: 'Webhook não configurado.' }, 503);
  }

  const signature = request.headers.get('stripe-signature')?.trim() ?? '';
  if (!signature) {
    return stripeWebhookJson({ error: 'Assinatura não informada.' }, 400);
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return stripeWebhookJson({ error: 'Tipo de conteúdo não suportado.' }, 415);
  }

  let rawPayload: string;
  try {
    rawPayload = await readTextWithLimit(request, MAX_STRIPE_WEBHOOK_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return stripeWebhookJson({ error: error.message }, 413);
    }
    return stripeWebhookJson({ error: 'Não foi possível ler o evento.' }, 400);
  }

  if (!(await verifyStripeSignature(rawPayload, signature, secret))) {
    return stripeWebhookJson({ error: 'Assinatura inválida.' }, 400);
  }

  const event = parseEvent(rawPayload);
  if (!event) {
    return stripeWebhookJson({ error: 'Evento Stripe inválido.' }, 400);
  }

  return { event, object: event.data.object };
};

export const readString = (value: unknown, maxLength = 255) => (
  typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : null
);

export const readNestedId = (value: unknown) => {
  if (typeof value === 'string') return readString(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return readString((value as Record<string, unknown>).id);
};

export const readMetadataString = (
  object: Record<string, unknown>,
  key: string,
  maxLength = 255,
) => {
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  return readString((metadata as Record<string, unknown>)[key], maxLength);
};

export const readNonNegativeSafeInteger = (value: unknown) => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
);

export const readPositiveSafeInteger = (value: unknown) => {
  const number = readNonNegativeSafeInteger(value);
  return number !== null && number > 0 ? number : null;
};

export const normalizeCurrency = (value: unknown) => (
  typeof value === 'string' && /^[a-z]{3}$/i.test(value) ? value.toUpperCase() : null
);
