import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
});
const CODE_PATTERN = /^VDM-[A-F0-9]{16}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!CODE_PATTERN.test(code)) return json({ valid: false });

    const { data, error } = await getAdminClient()
      .from("course_certificates")
      .select("certificate_code, student_name_snapshot, course_title_snapshot, issued_at, revoked_at")
      .eq("certificate_code", code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ valid: false });

    return json({
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
    return json({ error: error instanceof Error ? error.message : "Unexpected validation error" }, 500);
  }
});
