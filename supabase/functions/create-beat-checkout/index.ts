import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const normalizeCode = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().toUpperCase().slice(0, 32) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { userId } = await getAuthContext(req);
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("SITE_URL");
    if (!stripeSecretKey || !siteUrl) return json({ error: "Stripe checkout is not configured" }, 503);

    const body = await req.json();
    const licenseIds = Array.isArray(body.licenseIds)
      ? [...new Set(body.licenseIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))]
      : [];
    if (!licenseIds.length || licenseIds.length > 20) return json({ error: "Select between 1 and 20 licenses" }, 400);

    const admin = getAdminClient();
    const { data: orderResult, error: orderError } = await admin.rpc("create_beat_order_with_promotions", {
      target_buyer_id: userId,
      target_license_ids: licenseIds,
      target_coupon_code: normalizeCode(body.couponCode),
      target_affiliate_code: normalizeCode(body.affiliateCode),
    });
    if (orderError) return json({ error: orderError.message }, 409);

    const orderId = orderResult.order_id;
    const { data: items, error: itemsError } = await admin
      .from("beat_order_items")
      .select("license_id, amount_cents, currency, beat_licenses!inner(name), beats!inner(title)")
      .eq("order_id", orderId)
      .order("id");
    if (itemsError || !items?.length) throw itemsError ?? new Error("Order items were not created");

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("client_reference_id", orderId);
    params.set("success_url", `${siteUrl.replace(/\/$/, "")}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${siteUrl.replace(/\/$/, "")}/carrinho`);
    params.set("metadata[order_id]", orderId);
    params.set("payment_intent_data[metadata][order_id]", orderId);
    items.forEach((item, index) => {
      params.set(`line_items[${index}][quantity]`, "1");
      params.set(`line_items[${index}][price_data][currency]`, item.currency.toLowerCase());
      params.set(`line_items[${index}][price_data][unit_amount]`, String(item.amount_cents));
      params.set(`line_items[${index}][price_data][product_data][name]`, `${item.beats.title} - ${item.beat_licenses.name}`);
      params.set(`line_items[${index}][price_data][product_data][metadata][license_id]`, item.license_id);
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok || !session.id || !session.url) {
      await admin.from("beat_orders").update({ status: "canceled" }).eq("id", orderId);
      return json({ error: session.error?.message ?? "Stripe rejected the checkout session" }, 502);
    }

    await admin.from("beat_orders").update({ provider_session_id: session.id }).eq("id", orderId);
    return json({
      orderId,
      checkoutUrl: session.url,
      subtotalCents: orderResult.subtotal_cents,
      discountCents: orderResult.discount_cents,
      amountCents: orderResult.amount_cents,
      currency: orderResult.currency,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected checkout error" }, 500);
  }
});

