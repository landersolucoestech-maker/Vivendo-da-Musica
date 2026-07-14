import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseUserClient } = await getAuthContext(req);
    const { lessonId, fileKind } = await req.json();

    if (!lessonId || !["samples", "project"].includes(fileKind)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read through the CALLER's own RLS-scoped client: lesson_files SELECT
    // is gated by is_enrolled()/is_course_staff() in the database, so a row
    // coming back here IS the authorization proof. There is no separate
    // enrollment check to keep in sync with the database policy.
    const { data: file, error } = await supabaseUserClient
      .from("lesson_files")
      .select("samples_file_path, project_file_path")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (error || !file) {
      return new Response(JSON.stringify({ error: "Not found or not authorized" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const path = fileKind === "samples" ? file.samples_file_path : file.project_file_path;
    const bucket = fileKind === "samples" ? "lesson-samples" : "lesson-projects";

    if (!path) {
      return new Response(JSON.stringify({ error: "File not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The bucket is private, so only the service-role admin client can mint
    // a signed URL for it.
    const admin = getAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed) {
      return new Response(JSON.stringify({ error: "Could not sign URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
