import { corsHeaders } from "./cors.ts";

export const MAX_PROTECTED_JSON_BYTES = 16_384;

const protectedHeaders: HeadersInit = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

class PayloadTooLargeError extends Error {}

export const protectedJson = (body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: protectedHeaders },
);

export const protectedOptions = () => new Response(null, {
  status: 204,
  headers: protectedHeaders,
});

const readBodyWithLimit = async (request: Request, maxBytes: number) => {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      throw new Error("invalid_content_length");
    }
    if (contentLength > maxBytes) {
      throw new PayloadTooLargeError("Payload excede o limite permitido.");
    }
  }

  if (!request.body) return "";
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
        await reader.cancel("payload_too_large");
        throw new PayloadTooLargeError("Payload excede o limite permitido.");
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
  return new TextDecoder("utf-8", { fatal: true }).decode(merged);
};

export const readProtectedJsonObject = async (
  request: Request,
  maxBytes = MAX_PROTECTED_JSON_BYTES,
): Promise<Record<string, unknown> | Response> => {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return protectedJson({ error: "Tipo de conteúdo não suportado." }, 415);
  }

  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(request, maxBytes);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return protectedJson({ error: error.message }, 413);
    }
    return protectedJson({ error: "Corpo da requisição inválido." }, 400);
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return protectedJson({ error: "O corpo deve ser um objeto JSON." }, 400);
    }
    return parsed as Record<string, unknown>;
  } catch {
    return protectedJson({ error: "JSON inválido." }, 400);
  }
};
