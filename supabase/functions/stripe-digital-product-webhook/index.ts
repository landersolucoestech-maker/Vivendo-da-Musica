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
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook is not configured", { status: 503 });

  const rawBody = await req.text();
  if (!(await verifySignature(rawBody, signature, secret))) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(rawBody);
  const object = event.data?.object;
  const orderId = object?.metadata?.order_id ?? object?.client_reference_id;
  if (!orderId || object?.metadata?.order_kind !== "digital_product") return new Response("ok", { status: 200 });

  const admin = getAdminClient();
  const { data: order, error } = await admin.from("digital_product_orders")
    .select("id, status, amount_cents, currency, provider_session_id")
    .eq("id", orderId).single();
  if (error || !order) return new Response("Order not found", { status: 404 });

  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    if (object.payment_status !== "paid") return new Response("ok", { status: 200 });
    if (object.id !== order.provider_session_id || object.amount_total !== order.amount_cents || String(object.currency).toUpperCase() !== order.currency) {
      return new Response("Order reconciliation failed", { status: 409 });
    }
    const { data: marked, error: markError } = await admin.rpc("mark_digital_product_order_paid", {
      target_order_id: order.id,
      target_provider_session_id: object.id,
      target_provider_payment_id: object.payment_intent,
    });
    if (markError || !marked) return new Response("Order update failed", { status: 500 });
  }

  if (["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type) && order.status === "pending") {
    await admin.from("digital_product_orders").update({ status: "canceled" }).eq("id", order.id).eq("status", "pending");
  }
  return new Response("ok", { status: 200 });
});
