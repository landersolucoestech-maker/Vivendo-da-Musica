import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { userId } = await getAuthContext(req);
    const body = await req.json();
    const fileId = typeof body.fileId === "string" ? body.fileId : "";
    if (!fileId) return json({ error: "File is required" }, 400);

    const admin = getAdminClient();
    const { data: file, error: fileError } = await admin.from("seller_product_files")
      .select("id, product_id, storage_path").eq("id", fileId).single();
    if (fileError || !file) return json({ error: "File not found" }, 404);

    const { data: purchase, error: purchaseError } = await admin.from("digital_product_order_items")
      .select("id, digital_product_orders!inner(id)")
      .eq("product_id", file.product_id)
      .eq("digital_product_orders.buyer_id", userId)
      .eq("digital_product_orders.status", "paid")
      .limit(1)
      .maybeSingle();
    if (purchaseError) return json({ error: "Purchase validation failed" }, 500);
    if (!purchase) return json({ error: "Paid purchase required" }, 403);

    const { data: signed, error: signedError } = await admin.storage
      .from("seller-product-files").createSignedUrl(file.storage_path, 60);
    if (signedError || !signed?.signedUrl) return json({ error: "Could not authorize download" }, 500);
    return json({ url: signed.signedUrl, expiresIn: 60 });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected download error" }, 500);
  }
});
