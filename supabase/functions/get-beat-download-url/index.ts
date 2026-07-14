import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { userId } = await getAuthContext(req);
    const body = await req.json().catch(() => ({}));
    const deliveryId = typeof body.deliveryId === "string" ? body.deliveryId : "";
    if (!UUID_PATTERN.test(deliveryId)) return json({ error: "Invalid delivery id" }, 400);

    const admin = getAdminClient();
    const { data: delivery, error: deliveryError } = await admin
      .from("beat_deliveries")
      .select("id, file_label, storage_bucket, file_path, expires_at, download_count, beat_license_purchases!inner(buyer_id, status)")
      .eq("id", deliveryId)
      .maybeSingle();

    if (deliveryError) throw deliveryError;
    if (!delivery) return json({ error: "Delivery not found" }, 404);

    const purchase = Array.isArray(delivery.beat_license_purchases)
      ? delivery.beat_license_purchases[0]
      : delivery.beat_license_purchases;
    if (!purchase || purchase.buyer_id !== userId) return json({ error: "Delivery not found" }, 404);
    if (purchase.status !== "active") return json({ error: "License is not active" }, 403);
    if (delivery.expires_at && new Date(delivery.expires_at).getTime() <= Date.now()) {
      return json({ error: "Delivery has expired" }, 410);
    }

    const safeName = delivery.file_label.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "beat-download";
    const { data: signed, error: signedError } = await admin.storage
      .from(delivery.storage_bucket)
      .createSignedUrl(delivery.file_path, 60, { download: safeName });
    if (signedError || !signed?.signedUrl) {
      return json({ error: "File is temporarily unavailable" }, 404);
    }

    const { error: auditError } = await admin
      .from("beat_deliveries")
      .update({
        downloaded_at: new Date().toISOString(),
        download_count: delivery.download_count + 1,
      })
      .eq("id", delivery.id);
    if (auditError) throw auditError;

    return json({ url: signed.signedUrl, expiresIn: 60, fileLabel: delivery.file_label });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected download error" }, 500);
  }
});
