import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};
const verifySignature = async (body: string, signature: string, secret: string) => {
  const fields = signature.split(",").map((item) => item.split("=", 2));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
  return signatures.some((candidate) => safeEqual(candidate, expected));
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("STRIPE_BEAT_WEBHOOK_SECRET") ?? Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook is not configured", { status: 503 });

  const rawBody = await req.text();
  if (!(await verifySignature(rawBody, signature, secret))) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(rawBody);
  const object = event.data?.object;
  const admin = getAdminClient();

  if (event.type === "refund.created" || event.type === "charge.dispute.created") {
    const paymentIntentId = typeof object?.payment_intent === "string" ? object.payment_intent : object?.payment_intent?.id;
    if (!paymentIntentId) return new Response("ok", { status: 200 });

    const { data: reversalOrder, error: reversalOrderError } = await admin
      .from("beat_orders")
      .select("id")
      .eq("provider_payment_id", paymentIntentId)
      .maybeSingle();
    if (reversalOrderError) return new Response("Order lookup failed", { status: 500 });
    if (!reversalOrder) return new Response("ok", { status: 200 });

    const reversalKind = event.type === "refund.created" ? "refund" : "chargeback";
    const { error: reversalError } = await admin.rpc("reverse_beat_order_ledger", {
      target_order_id: reversalOrder.id,
      reversal_kind: reversalKind,
      provider_event: event.id,
      reversal_amount_cents: object.amount,
      reversal_currency: String(object.currency).toUpperCase(),
      reversal_reason: object.reason ?? object.status ?? null,
    });
    if (reversalError) return new Response("Financial reversal failed", { status: 500 });
    return new Response("ok", { status: 200 });
  }

  const orderId = object?.metadata?.order_id ?? object?.client_reference_id;
  if (!orderId) return new Response("ok", { status: 200 });

  const { data: order, error } = await admin
    .from("beat_orders")
    .select("id, status, amount_cents, currency, provider_session_id")
    .eq("id", orderId)
    .single();
  if (error || !order) return new Response("Order not found", { status: 404 });

  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    if (object.payment_status !== "paid") return new Response("ok", { status: 200 });
    if (object.id !== order.provider_session_id || object.amount_total !== order.amount_cents || String(object.currency).toUpperCase() !== order.currency) {
      return new Response("Order reconciliation failed", { status: 409 });
    }
    if (order.status === "pending") {
      const { error: updateError } = await admin.from("beat_orders").update({
        status: "paid",
        provider_payment_id: object.payment_intent,
        paid_at: new Date().toISOString(),
      }).eq("id", order.id).eq("status", "pending");
      if (updateError) return new Response("Order update failed", { status: 500 });
    }
  }

  if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type) && order.status === "pending") {
    await admin.from("beat_orders").update({ status: "canceled" }).eq("id", order.id).eq("status", "pending");
  }

  return new Response("ok", { status: 200 });
});
