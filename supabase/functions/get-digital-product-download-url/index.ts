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

    const fileId = typeof body.fileId === "string" ? body.fileId : "";
    if (!UUID_PATTERN.test(fileId)) {
      return protectedJson({ error: "Identificador de arquivo inválido." }, 400);
    }

    const admin = getAdminClient();
    const { data: file, error: fileError } = await admin
      .from("seller_product_files")
      .select("id,product_id,storage_path")
      .eq("id", fileId)
      .maybeSingle();
    if (fileError) {
      return protectedJson({ error: "Não foi possível consultar o arquivo." }, 500);
    }
    if (!file) return protectedJson({ error: "Arquivo não encontrado." }, 404);

    const { data: purchase, error: purchaseError } = await admin
      .from("digital_product_order_items")
      .select("id,digital_product_orders!inner(id)")
      .eq("product_id", file.product_id)
      .eq("digital_product_orders.buyer_id", userId)
      .eq("digital_product_orders.status", "paid")
      .limit(1)
      .maybeSingle();
    if (purchaseError) {
      return protectedJson({ error: "Não foi possível validar a compra." }, 500);
    }
    if (!purchase) {
      return protectedJson({ error: "É necessária uma compra paga para baixar este arquivo." }, 403);
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("seller-product-files")
      .createSignedUrl(String(file.storage_path), SIGNED_URL_TTL_SECONDS);
    if (signedError || !signed?.signedUrl) {
      return protectedJson({ error: "Não foi possível autorizar o download." }, 500);
    }

    return protectedJson({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("get-digital-product-download-url failed", error);
    return protectedJson({ error: "Não foi possível autorizar o download." }, 500);
  }
});
