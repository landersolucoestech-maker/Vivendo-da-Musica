import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  normalizeCurrency,
  readMetadataString,
  readNestedId,
  readNonNegativeSafeInteger,
  readString,
  readVerifiedStripeWebhook,
  stripeWebhookJson,
} from "../_shared/stripeWebhook.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);
const FAILURE_EVENTS = new Set([
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
]);

Deno.serve(async (request) => {
  const verified = await readVerifiedStripeWebhook(request, [
    "STRIPE_DIGITAL_PRODUCT_WEBHOOK_SECRET",
    "STRIPE_WEBHOOK_SECRET",
  ]);
  if (verified instanceof Response) return verified;

  const { event, object } = verified;
  const orderKind = readMetadataString(object, "order_kind", 50);
  if (orderKind !== "digital_product") {
    return stripeWebhookJson({ received: true, ignored: true, reason: "unexpected_order_kind" });
  }

  const orderId = readMetadataString(object, "order_id", 100)
    ?? readString(object.client_reference_id, 100);
  if (!orderId || !UUID_PATTERN.test(orderId)) {
    return stripeWebhookJson({ received: true, ignored: true, reason: "missing_order_id" });
  }

  const admin = getAdminClient();
  const { data: order, error: orderError } = await admin
    .from("digital_product_orders")
    .select("id,status,amount_cents,currency,provider_session_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    return stripeWebhookJson({ error: "Não foi possível consultar o pedido." }, 500);
  }
  if (!order) {
    return stripeWebhookJson({ error: "Pedido não encontrado." }, 404);
  }

  if (SUCCESS_EVENTS.has(event.type)) {
    if (readString(object.payment_status, 50) !== "paid") {
      return stripeWebhookJson({ received: true, ignored: true, reason: "payment_not_paid" });
    }

    const providerSessionId = readString(object.id);
    const paymentIntentId = readNestedId(object.payment_intent);
    const amountCents = readNonNegativeSafeInteger(object.amount_total);
    const currency = normalizeCurrency(object.currency);
    if (
      !providerSessionId
      || !paymentIntentId
      || amountCents === null
      || !currency
      || providerSessionId !== order.provider_session_id
      || amountCents !== Number(order.amount_cents)
      || currency !== String(order.currency).toUpperCase()
    ) {
      return stripeWebhookJson({ error: "Reconciliação do pedido falhou." }, 409);
    }

    const { data: marked, error: markError } = await admin.rpc("mark_digital_product_order_paid", {
      target_order_id: order.id,
      target_provider_session_id: providerSessionId,
      target_provider_payment_id: paymentIntentId,
    });
    if (markError || !marked) {
      return stripeWebhookJson({ error: "Não foi possível confirmar o pedido." }, 500);
    }
    return stripeWebhookJson({ received: true, processed: true });
  }

  if (FAILURE_EVENTS.has(event.type) && order.status === "pending") {
    const { error: cancelError } = await admin
      .from("digital_product_orders")
      .update({ status: "canceled" })
      .eq("id", order.id)
      .eq("status", "pending");
    if (cancelError) {
      return stripeWebhookJson({ error: "Não foi possível cancelar o pedido." }, 500);
    }
    return stripeWebhookJson({ received: true, processed: true });
  }

  return stripeWebhookJson({ received: true, ignored: true });
});
