import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";
import {
  protectedJson,
  protectedOptions,
  readProtectedJsonObject,
} from "../_shared/protectedEndpoint.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
}).format(new Date(value));

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") return protectedJson({ error: "Método não permitido." }, 405);

  try {
    const { userId } = await getAuthContext(request);
    const body = await readProtectedJsonObject(request);
    if (body instanceof Response) return body;

    const certificateId = typeof body.certificateId === "string" ? body.certificateId : "";
    if (!UUID_PATTERN.test(certificateId)) {
      return protectedJson({ error: "Identificador de certificado inválido." }, 400);
    }

    const admin = getAdminClient();
    const { data: certificate, error } = await admin
      .from("course_certificates")
      .select("id,user_id,certificate_code,student_name_snapshot,course_title_snapshot,issued_at,revoked_at")
      .eq("id", certificateId)
      .maybeSingle();
    if (error) {
      return protectedJson({ error: "Não foi possível consultar o certificado." }, 500);
    }
    if (!certificate) return protectedJson({ error: "Certificado não encontrado." }, 404);

    if (certificate.user_id !== userId) {
      const { data: profile, error: profileError } = await admin
        .from("user_profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError) {
        return protectedJson({ error: "Não foi possível validar o acesso." }, 500);
      }
      if (!profile || !["admin", "super_admin"].includes(profile.role)) {
        return protectedJson({ error: "Certificado não encontrado." }, 404);
      }
    }
    if (certificate.revoked_at) {
      return protectedJson({ error: "O certificado foi revogado." }, 403);
    }

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
    centered(String(certificate.student_name_snapshot), 324, 25, bold, gold);
    centered("concluiu integralmente o curso", 275, 13);
    centered(String(certificate.course_title_snapshot), 225, 21, bold);
    centered(`Emitido em ${formatDate(String(certificate.issued_at))}`, 156, 11);
    centered(`Codigo de validacao: ${certificate.certificate_code}`, 126, 10, bold, gold);
    centered("Autenticidade verificavel na plataforma Vivendo da Musica", 75, 8);

    const bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${certificate.certificate_code}.pdf"`,
        "Content-Type": "application/pdf",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("get-course-certificate failed", error);
    return protectedJson({ error: "Não foi possível gerar o certificado." }, 500);
  }
});
