import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { apiHeaders, failure, hmacSha256, json, parsePagination, secureEqual, sha256 } from "../_shared/api.ts";

const MAX_WEBHOOK_BYTES = 1_048_576;

class PayloadTooLargeError extends Error {}

const catalogs = {
  courses: {
    table: "courses",
    fields: "id,title,slug,description,thumbnail_url,price_cents,currency,status,instructor_id,created_at,updated_at",
    publicStatus: ["published"],
    filterFields: ["status"],
    searchFields: ["title", "description"],
    defaultSort: "created_at",
  },
  beats: {
    table: "beats",
    fields: "id,producer_id,title,slug,description,genre,bpm,musical_key,mood,duration_seconds,cover_url,status,copyright_status,exclusive_available,published_at,created_at,updated_at",
    publicStatus: ["published"],
    filterFields: ["status", "genre", "mood", "musical_key"],
    searchFields: ["title", "description", "genre", "mood"],
    defaultSort: "published_at",
  },
  events: {
    table: "events",
    fields: "id,slug,title,description,category,host_name,speakers,starts_at,ends_at,timezone,location,capacity,registration_count,status,cover_url,certificate_enabled,created_at,updated_at",
    publicStatus: ["upcoming", "live", "replay"],
    filterFields: ["status", "category"],
    searchFields: ["title", "description", "host_name", "location"],
    defaultSort: "starts_at",
  },
  opportunities: {
    table: "opportunities",
    fields: "id,slug,kind,title,organization_name,location,engagement_type,description,requirements,compensation,external_url,deadline_at,status,application_count,published_at,created_at,updated_at",
    publicStatus: ["open"],
    filterFields: ["status", "kind", "engagement_type"],
    searchFields: ["title", "description", "organization_name", "location"],
    defaultSort: "published_at",
  },
} as const;

function routeParts(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const versionIndex = parts.indexOf("v1");
  return versionIndex < 0 ? [] : parts.slice(versionIndex + 1);
}

function resolveTraceId(req: Request) {
  const supplied = req.headers.get("x-trace-id")?.trim();
  return supplied && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

async function readTextWithLimit(req: Request, maxBytes: number) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PayloadTooLargeError("Webhook payload exceeds 1 MB");
  }
  if (!req.body) return "";

  const reader = req.body.getReader();
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
        throw new PayloadTooLargeError("Webhook payload exceeds 1 MB");
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
}

async function observe(
  req: Request,
  response: Response,
  context: { requestId: string; traceId: string; route: string; startedAt: number },
) {
  const durationMs = Math.max(0, Math.round(performance.now() - context.startedAt));
  const errorCode = response.headers.get("x-error-code");
  response.headers.set("X-Trace-Id", context.traceId);
  console.log(JSON.stringify({
    level: response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info",
    event: "api.request.completed",
    service: "api-v1",
    trace_id: context.traceId,
    request_id: context.requestId,
    route: context.route,
    method: req.method,
    status_code: response.status,
    duration_ms: durationMs,
    error_code: errorCode,
  }));
  const admin = getAdminClient();
  const { error } = await admin.rpc("record_api_observation", {
    p_trace_id: context.traceId,
    p_request_id: context.requestId,
    p_service: "api-v1",
    p_route: context.route,
    p_method: req.method,
    p_status_code: response.status,
    p_duration_ms: durationMs,
    p_error_code: errorCode,
  });
  if (error) console.warn(JSON.stringify({ level: "warn", event: "telemetry.persist.failed", request_id: context.requestId, code: error.code }));
  return response;
}

async function rateLimit(req: Request, routeKey: string, requestId: string) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const actor = (
    req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || forwarded
    || "unknown"
  ).slice(0, 200);
  const salt = Deno.env.get("RATE_LIMIT_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!salt) {
    return { response: failure(req, requestId, 503, "RATE_LIMIT_UNAVAILABLE", "Rate limit service unavailable") };
  }
  const actorHash = await sha256(`${salt}:${actor}`);
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("consume_api_rate_limit", {
    p_actor_hash: actorHash,
    p_route_key: routeKey,
    p_limit: routeKey.startsWith("webhooks:") ? 120 : 60,
    p_window_seconds: 60,
  });
  if (error) return { response: failure(req, requestId, 503, "RATE_LIMIT_UNAVAILABLE", "Rate limit service unavailable") };
  const result = data?.[0];
  if (!result?.allowed) {
    return { response: failure(req, requestId, 429, "RATE_LIMITED", "Too many requests"), remaining: 0, retryAfter: result?.retry_after_seconds ?? 60 };
  }
  return { remaining: result.remaining as number, retryAfter: result.retry_after_seconds as number };
}

async function listCatalog(req: Request, requestId: string, resource: keyof typeof catalogs) {
  const url = new URL(req.url);
  let pagination;
  try { pagination = parsePagination(url); }
  catch (error) { return failure(req, requestId, 400, "INVALID_PAGINATION", (error as Error).message); }

  const config = catalogs[resource];
  const admin = getAdminClient();
  let query = admin.from(config.table).select(config.fields, { count: "exact" }).in("status", [...config.publicStatus]);
  const q = url.searchParams.get("q")?.trim().slice(0, 100);
  if (q) {
    const safeQuery = q.replace(/[%_,()]/g, "");
    query = query.or(config.searchFields.map((field) => `${field}.ilike.%${safeQuery}%`).join(","));
  }
  for (const field of config.filterFields) {
    const value = url.searchParams.get(field)?.trim().slice(0, 80);
    if (value && field !== "status") query = query.eq(field, value);
  }
  const sort = url.searchParams.get("sort") ?? config.defaultSort;
  const allowedSort = new Set([config.defaultSort, "created_at", "updated_at", "title"]);
  if (!allowedSort.has(sort)) return failure(req, requestId, 400, "INVALID_SORT", "Unsupported sort field");
  const direction = url.searchParams.get("direction") === "asc" ? "asc" : "desc";
  const { data, count, error } = await query.order(sort, { ascending: direction === "asc", nullsFirst: false }).range(pagination.from, pagination.to);
  if (error) return failure(req, requestId, 500, "QUERY_FAILED", "Could not load catalog");
  const total = count ?? 0;
  return json(req, requestId, { data, meta: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit), filters: { q: q ?? null }, sort, direction } });
}

async function receiveWebhook(req: Request, requestId: string, provider: string) {
  if (!/^[a-z0-9_-]{2,40}$/.test(provider)) return failure(req, requestId, 400, "INVALID_PROVIDER", "Invalid webhook provider");
  const secretName = `${provider.toUpperCase().replace(/-/g, "_")}_WEBHOOK_SECRET`;
  const secret = Deno.env.get(secretName);
  if (!secret) return failure(req, requestId, 503, "WEBHOOK_NOT_CONFIGURED", "Webhook provider is not configured");
  const eventId = req.headers.get("x-webhook-id")?.trim();
  const eventType = req.headers.get("x-webhook-event")?.trim();
  const supplied = req.headers.get("x-webhook-signature")?.replace(/^sha256=/, "").toLowerCase();
  if (!eventId || eventId.length > 200 || !eventType || eventType.length > 100 || !supplied) {
    return failure(req, requestId, 400, "INVALID_WEBHOOK_HEADERS", "Webhook id, event and signature are required");
  }
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return failure(req, requestId, 415, "UNSUPPORTED_MEDIA_TYPE", "Webhook payload must use application/json");
  }

  let rawBody: string;
  try {
    rawBody = await readTextWithLimit(req, MAX_WEBHOOK_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return failure(req, requestId, 413, "PAYLOAD_TOO_LARGE", error.message);
    }
    return failure(req, requestId, 400, "INVALID_BODY", "Could not read webhook payload");
  }

  const expected = await hmacSha256(secret, rawBody);
  if (!secureEqual(supplied, expected)) return failure(req, requestId, 401, "INVALID_SIGNATURE", "Webhook signature is invalid");

  let parsedPayload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return failure(req, requestId, 400, "INVALID_JSON", "Webhook payload must be a JSON object");
    }
    parsedPayload = parsed as Record<string, unknown>;
  } catch {
    return failure(req, requestId, 400, "INVALID_JSON", "Webhook payload must be valid JSON");
  }

  const admin = getAdminClient();
  const payloadHash = await sha256(rawBody);
  const { data, error } = await admin.from("webhook_receipts").insert({
    provider,
    external_event_id: eventId,
    event_type: eventType,
    payload_hash: payloadHash,
    payload: parsedPayload,
  }).select("id,processing_status,received_at").single();
  if (error?.code === "23505") return json(req, requestId, { data: { duplicate: true, external_event_id: eventId } }, 200);
  if (error) return failure(req, requestId, 500, "WEBHOOK_PERSIST_FAILED", "Could not persist webhook receipt");
  return json(req, requestId, { data: { ...data, duplicate: false } }, 202);
}

Deno.serve(async (req: Request) => {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  const traceId = resolveTraceId(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: apiHeaders(req, requestId) });
  const parts = routeParts(new URL(req.url));
  if (parts.length === 0) return observe(req, failure(req, requestId, 404, "VERSION_NOT_FOUND", "Use API version /v1"), { requestId, traceId, route: "unknown", startedAt });
  const routeKey = parts.join(":");
  const limited = await rateLimit(req, routeKey, requestId);
  if (limited.response) {
    const response = new Response(await limited.response.text(), { status: limited.response.status, headers: { ...Object.fromEntries(limited.response.headers), "Retry-After": String(limited.retryAfter ?? 60), "X-RateLimit-Remaining": String(limited.remaining ?? 0) } });
    return observe(req, response, { requestId, traceId, route: routeKey, startedAt });
  }
  let response: Response;
  if (req.method === "GET" && parts[0] === "health" && parts.length === 1) {
    response = json(req, requestId, { data: { status: "healthy", version: "1", components: { edge: "healthy", database: "healthy", rate_limit_cache: "healthy" }, timestamp: new Date().toISOString() } });
  } else if (req.method === "GET" && parts[0] === "catalog" && parts[1] in catalogs && parts.length === 2) {
    response = await listCatalog(req, requestId, parts[1] as keyof typeof catalogs);
  } else if (req.method === "POST" && parts[0] === "webhooks" && parts[1] && parts.length === 2) {
    response = await receiveWebhook(req, requestId, parts[1]);
  } else {
    response = failure(req, requestId, 404, "ROUTE_NOT_FOUND", "API route not found");
  }
  response.headers.set("X-RateLimit-Remaining", String(limited.remaining ?? 0));
  return observe(req, response, { requestId, traceId, route: routeKey, startedAt });
});
