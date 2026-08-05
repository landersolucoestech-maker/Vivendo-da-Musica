import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  normalizeCurrency,
  readMetadataString,
  readNestedId,
  readNonNegativeSafeInteger,
  readPositiveSafeInteger,
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
const REVERSAL_EVENTS = new Set([
  "refund.created",
  "charge.dispute.created",
]);

Deno.serve(async (request) => {
  const verified = await readVerifiedStripeWebhook(request, [
    "STRIPE_BEAT_WEBHOOK_SECRET",
    "STRIPE_WEBHOOK_SECRET",
  ]);
  if (verified instanceof Response) return verified;

  const { event, object } = verified;
  const admin = getAdminClient();

  if (REVERSAL_EVENTS.has(event.type)) {
    const paymentIntentId = readNestedId(object.payment_intent);
    if (!paymentIntentId) {
      return stripeWebhookJson({ received: true, ignored: true, reason: "missing_payment_intent" });
    }

    const amountCents = readPositiveSafeInteger(object.amount);
    const currency = normalizeCurrency(object.currency);
    if (amountCents === null || !currency) {
      return stripeWebhookJson({ error: "Dados financeiros de reversão inválidos." }, 400);
    }

    const { data: reversalOrder, error: reversalOrderError } = await admin
      .from("beat_orders")
      .select("id")
      .eq("provider_payment_id", paymentIntentId)
      .maybeSingle();
    if (reversalOrderError) {
      return stripeWebhookJson({ error: "Não foi possível localizar o pedido." }, 500);
    }
    if (!reversalOrder) {
      return stripeWebhookJson({ received: true, ignored: true, reason: "order_not_found" });
    }

    const reversalKind = event.type === "refund.created" ? "refund" : "chargeback";
    const reversalReason = readString(object.reason, 500) ?? readString(object.status, 100);
    const { error: reversalError } = await admin.rpc("reverse_beat_order_ledger", {
      target_order_id: reversalOrder.id,
      reversal_kind: reversalKind,
      provider_event: event.id,
      reversal_amount_cents: amountCents,
      reversal_currency: currency,
      reversal_reason: reversalReason,
    });
    if (reversalError) {
      return stripeWebhookJson({ error: "Não foi possível registrar a reversão financeira." }, 500);
    }
    return stripeWebhookJson({ received: true, processed: true });
  }

  const orderId = readMetadataString(object, "order_id", 100)
    ?? readString(object.client_reference_id, 100);
  if (!orderId || !UUID_PATTERN.test(orderId)) {
    return stripeWebhookJson({ received: true, ignored: true, reason: "missing_order_id" });
  }

  const { data: order, error: orderError } = await admin
    .from("beat_orders")
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

    if (order.status === "pending") {
      const { error: updateError } = await admin
        .from("beat_orders")
        .update({
          status: "paid",
          provider_payment_id: paymentIntentId,
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("status", "pending");
      if (updateError) {
        return stripeWebhookJson({ error: "Não foi possível confirmar o pedido." }, 500);
      }
    }
    return stripeWebhookJson({ received: true, processed: true });
  }

  if (FAILURE_EVENTS.has(event.type) && order.status === "pending") {
    const { error: cancelError } = await admin
      .from("beat_orders")
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
