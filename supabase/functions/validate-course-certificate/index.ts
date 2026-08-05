import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  protectedJson,
  protectedOptions,
  readProtectedJsonObject,
} from "../_shared/protectedEndpoint.ts";

const CODE_PATTERN = /^VDM-[A-F0-9]{16}$/;
const validationJson = (body: unknown, status = 200) => {
  const response = protectedJson(body, status);
  response.headers.set("Cache-Control", status === 200 ? "private, max-age=60" : "no-store, max-age=0");
  return response;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") return validationJson({ error: "Método não permitido." }, 405);

  const body = await readProtectedJsonObject(request);
  if (body instanceof Response) return body;

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!CODE_PATTERN.test(code)) return validationJson({ valid: false });

  try {
    const { data, error } = await getAdminClient()
      .from("course_certificates")
      .select("certificate_code,student_name_snapshot,course_title_snapshot,issued_at,revoked_at")
      .eq("certificate_code", code)
      .maybeSingle();
    if (error) {
      console.error("validate-course-certificate query failed", { code: error.code, details: error.details });
      return validationJson({ error: "Não foi possível validar o certificado." }, 500);
    }
    if (!data) return validationJson({ valid: false });

    return validationJson({
      valid: data.revoked_at === null,
      revoked: data.revoked_at !== null,
      certificate: {
        code: data.certificate_code,
        studentName: data.student_name_snapshot,
        courseTitle: data.course_title_snapshot,
        issuedAt: data.issued_at,
      },
    });
  } catch (error) {
    console.error("validate-course-certificate failed", error);
    return validationJson({ error: "Não foi possível validar o certificado." }, 500);
  }
});
