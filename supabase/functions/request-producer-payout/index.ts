import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[a-zA-Z0-9:_-]{8,120}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { userId } = await getAuthContext(req);
    const body = await req.json().catch(() => ({}));
    const payoutMethodId = typeof body.payoutMethodId === "string" ? body.payoutMethodId : "";
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
    const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "BRL";
    const amountCents = Number(body.amountCents);

    if (!UUID_PATTERN.test(payoutMethodId)) return json({ error: "Invalid payout method" }, 400);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return json({ error: "Invalid payout amount" }, 400);
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) return json({ error: "Invalid idempotency key" }, 400);
    if (!/^[A-Z]{3}$/.test(currency)) return json({ error: "Invalid currency" }, 400);

    const admin = getAdminClient();
    const { data: payoutId, error } = await admin.rpc("request_producer_payout_for_user", {
      target_producer_id: userId,
      target_payout_method_id: payoutMethodId,
      requested_amount_cents: amountCents,
      request_idempotency_key: idempotencyKey,
      target_currency: currency,
    });
    if (error) {
      const expected = /not found|minimum|insufficient|invalid/i.test(error.message);
      return json({ error: error.message }, expected ? 409 : 500);
    }

    return json({ payoutId, status: "requested" }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected payout error" }, 500);
  }
});
