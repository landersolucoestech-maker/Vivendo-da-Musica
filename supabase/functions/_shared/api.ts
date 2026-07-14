export type ApiErrorBody = {
  error: { code: string; message: string; request_id: string; details?: unknown };
};

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length === 0 || configured.includes(origin) ? origin || "*" : "null";
}

export function apiHeaders(req: Request, requestId: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, idempotency-key, x-trace-id, x-webhook-id, x-webhook-event, x-webhook-signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Expose-Headers": "x-request-id, x-trace-id, x-api-version, x-error-code, x-ratelimit-remaining, retry-after",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-API-Version": "1",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  };
}

export function json(req: Request, requestId: string, body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...apiHeaders(req, requestId), ...extra },
  });
}

export function failure(req: Request, requestId: string, status: number, code: string, message: string, details?: unknown) {
  const body: ApiErrorBody = { error: { code, message, request_id: requestId } };
  if (details !== undefined) body.error.details = details;
  return json(req, requestId, body, status, { "X-Error-Code": code });
}

export function parsePagination(url: URL) {
  const rawPage = Number(url.searchParams.get("page") ?? "1");
  const rawLimit = Number(url.searchParams.get("limit") ?? "20");
  if (!Number.isInteger(rawPage) || rawPage < 1 || !Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    throw new Error("page must be >= 1 and limit must be between 1 and 100");
  }
  return { page: rawPage, limit: rawLimit, from: (rawPage - 1) * rawLimit, to: rawPage * rawLimit - 1 };
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

export async function hmacSha256(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
