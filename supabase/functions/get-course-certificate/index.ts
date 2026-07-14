import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
}).format(new Date(value));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { userId } = await getAuthContext(req);
    const body = await req.json().catch(() => ({}));
    const certificateId = typeof body.certificateId === "string" ? body.certificateId : "";
    if (!UUID_PATTERN.test(certificateId)) return json({ error: "Invalid certificate id" }, 400);

    const admin = getAdminClient();
    const { data: certificate, error } = await admin
      .from("course_certificates")
      .select("id, user_id, certificate_code, student_name_snapshot, course_title_snapshot, issued_at, revoked_at")
      .eq("id", certificateId)
      .maybeSingle();
    if (error) throw error;
    if (!certificate) return json({ error: "Certificate not found" }, 404);

    if (certificate.user_id !== userId) {
      const { data: profile } = await admin.from("user_profiles").select("role").eq("user_id", userId).maybeSingle();
      if (!profile || !["admin", "super_admin"].includes(profile.role)) return json({ error: "Certificate not found" }, 404);
    }
    if (certificate.revoked_at) return json({ error: "Certificate is revoked" }, 403);

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();
    const navy = rgb(0.055, 0.075, 0.16);
    const gold = rgb(0.88, 0.66, 0.2);
    const white = rgb(0.97, 0.97, 0.99);
    page.drawRectangle({ x: 0, y: 0, width, height, color: navy });
    page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: gold, borderWidth: 2 });
    page.drawRectangle({ x: 29, y: 29, width: width - 58, height: height - 58, borderColor: gold, borderWidth: 0.6 });

    const centered = (text: string, y: number, size: number, font = regular, color = white) => {
      const safeText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const textWidth = font.widthOfTextAtSize(safeText, size);
      page.drawText(safeText, { x: (width - textWidth) / 2, y, size, font, color });
    };

    centered("VIVENDO DA MUSICA", 500, 17, bold, gold);
    centered("CERTIFICADO DE CONCLUSAO", 432, 28, bold);
    centered("Certificamos que", 375, 13);
    centered(certificate.student_name_snapshot, 324, 25, bold, gold);
    centered("concluiu integralmente o curso", 275, 13);
    centered(certificate.course_title_snapshot, 225, 21, bold);
    centered(`Emitido em ${formatDate(certificate.issued_at)}`, 156, 11);
    centered(`Codigo de validacao: ${certificate.certificate_code}`, 126, 10, bold, gold);
    centered("Autenticidade verificavel na plataforma Vivendo da Musica", 75, 8);

    const bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificate_code}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected certificate error" }, 500);
  }
});
