import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  protectedJson,
  protectedOptions,
  readProtectedJsonObject,
} from "../_shared/protectedEndpoint.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_URL_TTL_SECONDS = 60;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") return protectedJson({ error: "Método não permitido." }, 405);

  try {
    const { userId } = await getAuthContext(request);
    const body = await readProtectedJsonObject(request);
    if (body instanceof Response) return body;

    const deliveryId = typeof body.deliveryId === "string" ? body.deliveryId : "";
    if (!UUID_PATTERN.test(deliveryId)) {
      return protectedJson({ error: "Identificador de entrega inválido." }, 400);
    }

    const admin = getAdminClient();
    const { data: delivery, error: deliveryError } = await admin
      .from("beat_deliveries")
      .select("id,file_label,storage_bucket,file_path,expires_at,download_count,beat_license_purchases!inner(buyer_id,status)")
      .eq("id", deliveryId)
      .maybeSingle();

    if (deliveryError) {
      return protectedJson({ error: "Não foi possível consultar a entrega." }, 500);
    }
    if (!delivery) return protectedJson({ error: "Entrega não encontrada." }, 404);

    const purchase = Array.isArray(delivery.beat_license_purchases)
      ? delivery.beat_license_purchases[0]
      : delivery.beat_license_purchases;
    if (!purchase || purchase.buyer_id !== userId) {
      return protectedJson({ error: "Entrega não encontrada." }, 404);
    }
    if (purchase.status !== "active") {
      return protectedJson({ error: "A licença não está ativa." }, 403);
    }
    if (delivery.expires_at && new Date(delivery.expires_at).getTime() <= Date.now()) {
      return protectedJson({ error: "A entrega expirou." }, 410);
    }

    const fileLabel = String(delivery.file_label ?? "beat-download");
    const safeName = fileLabel
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-|-$/g, "") || "beat-download";
    const { data: signed, error: signedError } = await admin.storage
      .from(String(delivery.storage_bucket))
      .createSignedUrl(String(delivery.file_path), SIGNED_URL_TTL_SECONDS, { download: safeName });
    if (signedError || !signed?.signedUrl) {
      return protectedJson({ error: "O arquivo está temporariamente indisponível." }, 404);
    }

    const { error: auditError } = await admin
      .from("beat_deliveries")
      .update({
        downloaded_at: new Date().toISOString(),
        download_count: Number(delivery.download_count ?? 0) + 1,
      })
      .eq("id", delivery.id);
    if (auditError) {
      return protectedJson({ error: "Não foi possível registrar o download." }, 500);
    }

    return protectedJson({
      url: signed.signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
      fileLabel,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("get-beat-download-url failed", error);
    return protectedJson({ error: "Não foi possível autorizar o download." }, 500);
  }
});
