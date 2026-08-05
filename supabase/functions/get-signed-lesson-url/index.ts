import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  protectedJson,
  protectedOptions,
  readProtectedJsonObject,
} from "../_shared/protectedEndpoint.ts";

const SIGNED_URL_TTL_SECONDS = 60 * 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE_KINDS = new Set(["samples", "project"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") return protectedJson({ error: "Método não permitido." }, 405);

  try {
    const { supabaseUserClient } = await getAuthContext(request);
    const body = await readProtectedJsonObject(request);
    if (body instanceof Response) return body;

    const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
    const fileKind = typeof body.fileKind === "string" ? body.fileKind : "";
    if (!UUID_PATTERN.test(lessonId) || !FILE_KINDS.has(fileKind)) {
      return protectedJson({ error: "Solicitação inválida." }, 400);
    }

    // The caller-scoped client remains subject to lesson_files RLS. A row
    // returned here is the authorization proof for enrollment/course staff.
    const { data: file, error: fileError } = await supabaseUserClient
      .from("lesson_files")
      .select("samples_file_path,project_file_path")
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (fileError || !file) {
      return protectedJson({ error: "Arquivo não encontrado." }, 404);
    }

    const path = fileKind === "samples" ? file.samples_file_path : file.project_file_path;
    const bucket = fileKind === "samples" ? "lesson-samples" : "lesson-projects";
    if (!path) return protectedJson({ error: "Arquivo não disponível." }, 404);

    const admin = getAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from(bucket)
      .createSignedUrl(String(path), SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      return protectedJson({ error: "Não foi possível autorizar o arquivo." }, 500);
    }

    return protectedJson({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("get-signed-lesson-url failed", error);
    return protectedJson({ error: "Não foi possível autorizar o arquivo." }, 500);
  }
});
