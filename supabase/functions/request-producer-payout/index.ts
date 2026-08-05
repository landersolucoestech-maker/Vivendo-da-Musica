import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  protectedJson,
  protectedOptions,
  readProtectedJsonObject,
} from "../_shared/protectedEndpoint.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[a-zA-Z0-9:_-]{8,120}$/;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") return protectedJson({ error: "Método não permitido." }, 405);

  try {
    const { userId } = await getAuthContext(request);
    const body = await readProtectedJsonObject(request);
    if (body instanceof Response) return body;

    const payoutMethodId = typeof body.payoutMethodId === "string" ? body.payoutMethodId : "";
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
    const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "BRL";
    const amountCents = Number(body.amountCents);

    if (!UUID_PATTERN.test(payoutMethodId)) {
      return protectedJson({ error: "Método de saque inválido." }, 400);
    }
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return protectedJson({ error: "Valor de saque inválido." }, 400);
    }
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
      return protectedJson({ error: "Chave de idempotência inválida." }, 400);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return protectedJson({ error: "Moeda inválida." }, 400);
    }

    const admin = getAdminClient();
    const { data: payoutId, error } = await admin.rpc("request_producer_payout_for_user", {
      target_producer_id: userId,
      target_payout_method_id: payoutMethodId,
      requested_amount_cents: amountCents,
      request_idempotency_key: idempotencyKey,
      target_currency: currency,
    });
    if (error) {
      const expectedConflict = /not found|minimum|insufficient|invalid/i.test(error.message);
      if (expectedConflict) {
        return protectedJson({ error: "A solicitação de saque não atende aos requisitos atuais." }, 409);
      }
      console.error("request-producer-payout RPC failed", { code: error.code, details: error.details });
      return protectedJson({ error: "Não foi possível solicitar o saque." }, 500);
    }

    return protectedJson({ payoutId, status: "requested" }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("request-producer-payout failed", error);
    return protectedJson({ error: "Não foi possível solicitar o saque." }, 500);
  }
});
