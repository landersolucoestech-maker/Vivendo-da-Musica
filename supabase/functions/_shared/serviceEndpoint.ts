export const MAX_SERVICE_JSON_BYTES = 65_536;

class PayloadTooLargeError extends Error {}

const configuredOrigins = () => (
  Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('DEV_ALLOWED_ORIGINS') ?? ''
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export const resolveServiceOrigin = (request: Request) => {
  const requestedOrigin = request.headers.get('origin');
  if (!requestedOrigin) return { origin: null, blocked: false };
  if (configuredOrigins().includes(requestedOrigin)) {
    return { origin: requestedOrigin, blocked: false };
  }

  try {
    const parsed = new URL(requestedOrigin);
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      return { origin: requestedOrigin, blocked: false };
    }
  } catch {
    // Invalid origins are rejected below.
  }
  return { origin: null, blocked: true };
};

const serviceHeaders = (origin: string | null): HeadersInit => ({
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
});

export const serviceReply = (
  body: unknown,
  status: number,
  origin: string | null,
) => new Response(JSON.stringify(body), {
  status,
  headers: serviceHeaders(origin),
});

export const serviceOptions = (origin: string | null) => new Response(null, {
  status: 204,
  headers: serviceHeaders(origin),
});

const readBodyWithLimit = async (request: Request, maxBytes: number) => {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      throw new Error('invalid_content_length');
    }
    if (contentLength > maxBytes) {
      throw new PayloadTooLargeError('Payload excede o limite permitido.');
    }
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
  return new TextDecoder('utf-8', { fatal: true }).decode(merged);
};

export const readServiceJsonObject = async (
  request: Request,
  origin: string | null,
): Promise<Record<string, unknown> | Response> => {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return serviceReply({ error: 'Tipo de conteúdo não suportado.' }, 415, origin);
  }

  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(request, MAX_SERVICE_JSON_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return serviceReply({ error: error.message }, 413, origin);
    }
    return serviceReply({ error: 'Corpo da requisição inválido.' }, 400, origin);
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return serviceReply({ error: 'O corpo deve ser um objeto JSON.' }, 400, origin);
    }
    return parsed as Record<string, unknown>;
  } catch {
    return serviceReply({ error: 'JSON inválido.' }, 400, origin);
  }
};
