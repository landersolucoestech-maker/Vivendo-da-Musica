import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";

import { getAuthContext } from "../_shared/authContext.ts";
import {
  protectedJson,
  protectedOptions,
  readProtectedJsonObject,
} from "../_shared/protectedEndpoint.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const DEV_PROJECT_REF = "ywirfqvobfnunlcsnptm";
const MAX_OFFERS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9:_-]{16,128}$/;

interface CommerceOrderResult {
  id: string;
  status: string;
  total_cents: number;
  currency: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveBrowserOrigin = (request: Request): string | null => {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const resolveReturnUrl = (
  rawValue: unknown,
  requestOrigin: string | null,
  fallbackPath: string,
): URL | null => {
  const configuredAppUrl = Deno.env.get("APP_URL")?.trim() || null;
  const allowedOrigin = requestOrigin ?? (
    configuredAppUrl
      ? (() => {
          try {
            return new URL(configuredAppUrl).origin;
          } catch {
            return null;
          }
        })()
      : null
  );

  if (!allowedOrigin) return null;

  try {
    const target = typeof rawValue === "string" && rawValue.trim()
      ? new URL(rawValue.trim(), allowedOrigin)
      : new URL(fallbackPath, allowedOrigin);

    if (target.origin !== allowedOrigin) return null;
    return target;
  } catch {
    return null;
  }
};

const readDemoBuyerId = async (
  body: Record<string, unknown>,
  admin: ReturnType<typeof getAdminClient>,
): Promise<string | null> => {
  const requestedBuyerId = typeof body.buyerId === "string"
    ? body.buyerId.trim()
    : "";

  if (!UUID_PATTERN.test(requestedBuyerId)) return null;

  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", requestedBuyerId)
    .eq("is_demo", true)
    .maybeSingle();

  if (error) {
    console.error("create-commerce-checkout demo buyer lookup failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data?.user_id ?? null;
};

const resolveBuyerId = async (
  request: Request,
  body: Record<string, unknown>,
  isDevProject: boolean,
  admin: ReturnType<typeof getAdminClient>,
): Promise<string | null> => {
  try {
    const { userId } = await getAuthContext(request);
    return userId;
  } catch (error) {
    if (!isDevProject) return null;

    if (!(error instanceof Response)) {
      console.error("create-commerce-checkout authentication failed", error);
    }

    return readDemoBuyerId(body, admin);
  }
};

const checkoutFailure = (
  code: string | undefined,
  origin: string | null,
) => {
  if (code === "23505") {
    return protectedJson({
      code: "CHECKOUT_CONFLICT",
      error: "Não foi possível reutilizar esta tentativa de checkout.",
    }, 409);
  }

  if (code === "P0001" || code === "23514") {
    return protectedJson({
      code: "CHECKOUT_UNAVAILABLE",
      error: "Um ou mais itens não estão disponíveis para esta compra.",
    }, 409);
  }

  if (code === "22023" || code === "22003") {
    return protectedJson({
      code: "INVALID_CHECKOUT",
      error: "Os dados do checkout não são válidos.",
    }, 400);
  }

  return protectedJson({
    code: "CHECKOUT_FAILED",
    error: "Não foi possível criar o pedido. Tente novamente.",
  }, 500);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") {
    return protectedJson({ code: "METHOD_NOT_ALLOWED", error: "Método não permitido." }, 405);
  }

  const requestOrigin = resolveBrowserOrigin(request);
  const body = await readProtectedJsonObject(request);
  if (body instanceof Response) return body;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const isDevProject = supabaseUrl.includes(DEV_PROJECT_REF);

  if (!isDevProject) {
    return protectedJson({
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      error: "O pagamento ainda não está disponível neste ambiente.",
    }, 503);
  }

  const offerIds = Array.isArray(body.offerIds)
    ? body.offerIds.filter((value): value is string =>
        typeof value === "string" && UUID_PATTERN.test(value)
      )
    : [];

  if (
    offerIds.length < 1
    || offerIds.length > MAX_OFFERS
    || new Set(offerIds).size !== offerIds.length
  ) {
    return protectedJson({
      code: "INVALID_OFFERS",
      error: "Selecione itens válidos para continuar.",
    }, 400);
  }

  const idempotencyKey = typeof body.idempotencyKey === "string"
    ? body.idempotencyKey.trim()
    : "";

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return protectedJson({
      code: "INVALID_IDEMPOTENCY_KEY",
      error: "Não foi possível identificar esta tentativa de checkout.",
    }, 400);
  }

  const context = isRecord(body.context) ? body.context : {};
  const successUrl = resolveReturnUrl(
    body.successUrl,
    requestOrigin,
    "/pagamento-sucesso",
  );
  const cancelUrl = resolveReturnUrl(
    body.cancelUrl,
    requestOrigin,
    "/checkout",
  );

  if (!successUrl || !cancelUrl) {
    return protectedJson({
      code: "INVALID_RETURN_URL",
      error: "Não foi possível validar o retorno do checkout.",
    }, 400);
  }

  const admin = getAdminClient();
  const buyerId = await resolveBuyerId(request, body, true, admin);
  if (!buyerId) {
    return protectedJson({
      code: "AUTHENTICATION_REQUIRED",
      error: "Entre na sua conta para continuar.",
    }, 401);
  }

  const { data: orderData, error: orderError } = await admin.rpc(
    "service_create_commerce_order",
    {
      target_buyer_id: buyerId,
      target_offer_ids: offerIds,
      target_context: context,
      target_idempotency_key: idempotencyKey,
      target_is_demo: true,
    },
  );

  if (orderError || !orderData) {
    console.error("create-commerce-checkout order creation failed", {
      code: orderError?.code,
      message: orderError?.message,
      buyerId,
      offerCount: offerIds.length,
    });
    return checkoutFailure(orderError?.code, requestOrigin);
  }

  const order = orderData as CommerceOrderResult;

  const { error: paymentError } = await admin.rpc(
    "service_confirm_canonical_payment",
    {
      target_order_id: order.id,
      target_provider: "development",
      target_provider_reference: `development:${order.id}`,
      target_payment_method: "development",
      target_provider_fee_cents: 0,
      target_provider_payload: {
        source: "canonical_dev_checkout",
      },
    },
  );

  if (paymentError) {
    console.error("create-commerce-checkout synthetic payment failed", {
      code: paymentError.code,
      message: paymentError.message,
      orderId: order.id,
    });
    return protectedJson({
      code: "PAYMENT_CONFIRMATION_FAILED",
      error: "O pedido foi criado, mas o pagamento não pôde ser confirmado.",
    }, 500);
  }

  successUrl.searchParams.set("pedido", order.id);

  return protectedJson({
    checkoutUrl: successUrl.toString(),
    orderId: order.id,
    provider: "development",
    paid: true,
  });
});
