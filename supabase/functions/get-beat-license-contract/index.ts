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
const asStrings = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.length <= 1_000).slice(0, 100)
  : [];
const money = (cents: number, currency: string) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency,
}).format(cents / 100);
const formatDate = (value: unknown) => {
  if (!value) return "Nao informado";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(parsed);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return protectedOptions();
  if (request.method !== "POST") return protectedJson({ error: "Método não permitido." }, 405);

  try {
    const { userId } = await getAuthContext(request);
    const body = await readProtectedJsonObject(request);
    if (body instanceof Response) return body;

    const purchaseId = typeof body.purchaseId === "string" ? body.purchaseId : "";
    if (!UUID_PATTERN.test(purchaseId)) {
      return protectedJson({ error: "Identificador de compra inválido." }, 400);
    }

    const admin = getAdminClient();
    const { data: purchase, error } = await admin
      .from("beat_license_purchases")
      .select("id,buyer_id,producer_id,status,issued_at,contract_number,contract_hash,license_snapshot,document_download_count")
      .eq("id", purchaseId)
      .maybeSingle();
    if (error) {
      return protectedJson({ error: "Não foi possível consultar o contrato." }, 500);
    }
    if (!purchase || purchase.buyer_id !== userId) {
      return protectedJson({ error: "Contrato não encontrado." }, 404);
    }
    if (purchase.status !== "active") {
      return protectedJson({ error: "A licença não está ativa." }, 403);
    }

    const { data: buyerAuth } = await admin.auth.admin.getUserById(purchase.buyer_id);
    const { data: producerAuth } = await admin.auth.admin.getUserById(purchase.producer_id);
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id,full_name")
      .in("user_id", [purchase.buyer_id, purchase.producer_id]);
    const buyerName = profiles?.find((profile) => profile.user_id === purchase.buyer_id)?.full_name
      || buyerAuth.user?.email
      || purchase.buyer_id;
    const producerName = profiles?.find((profile) => profile.user_id === purchase.producer_id)?.full_name
      || producerAuth.user?.email
      || purchase.producer_id;
    const snapshot = purchase.license_snapshot
      && typeof purchase.license_snapshot === "object"
      && !Array.isArray(purchase.license_snapshot)
      ? purchase.license_snapshot as Record<string, unknown>
      : {};
    const rights = asStrings(snapshot.usage_rights);
    const deliverables = asStrings(snapshot.deliverables);
    const amountCents = Number(snapshot.amount_cents);
    const rawCurrency = String(snapshot.currency ?? "BRL").toUpperCase();
    const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : "BRL";

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595.28, 841.89]);
    let y = 795;
    const margin = 48;
    const width = 499;
    const addPage = () => { page = pdf.addPage([595.28, 841.89]); y = 795; };
    const line = (value: string, size = 10, isBold = false, gap = 5) => {
      const font = isBold ? bold : regular;
      const text = value.replace(/\s+/g, " ").trim().slice(0, 5_000);
      const words = text.split(" ");
      let current = "";
      const rows: string[] = [];
      for (const word of words) {
        const candidate = current ? current + " " + word : word;
        if (font.widthOfTextAtSize(candidate, size) > width && current) {
          rows.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      if (current) rows.push(current);
      for (const row of rows) {
        if (y < 60) addPage();
        page.drawText(row, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.16) });
        y -= size + gap;
      }
    };
    const section = (title: string) => { y -= 8; line(title, 12, true, 7); };

    line("VIVENDO DA MUSICA", 16, true, 8);
    line("CONTRATO DIGITAL DE LICENCIAMENTO DE BEAT", 15, true, 10);
    line("Contrato: " + String(purchase.contract_number), 10, true);
    line("Emitido em: " + formatDate(purchase.issued_at));
    line("Hash SHA-256 dos termos: " + String(purchase.contract_hash), 8);

    section("1. PARTES");
    line("LICENCIANTE/PRODUTOR: " + producerName + " (ID " + purchase.producer_id + ").");
    line("LICENCIADO/COMPRADOR: " + buyerName + " (ID " + purchase.buyer_id + ").");

    section("2. OBJETO E LICENCA");
    line("Obra instrumental: " + String(snapshot.beat_title ?? "Beat") + ".");
    line("Modalidade: " + String(snapshot.license_name ?? snapshot.license_type ?? "Licenca") + ".");
    line("Genero: " + String(snapshot.genre ?? "Nao informado") + "; BPM: " + String(snapshot.bpm ?? "Nao informado") + "; tonalidade: " + String(snapshot.musical_key ?? "Nao informada") + ".");
    line("Natureza: " + (snapshot.is_exclusive ? "exclusiva" : "nao exclusiva") + ".");

    section("3. DIREITOS CONCEDIDOS");
    if (rights.length) rights.forEach((right, index) => line((index + 1) + ". " + right));
    else line("Os direitos de uso seguem exclusivamente a modalidade identificada neste documento.");
    if (snapshot.max_copies) line("Limite contratual registrado: " + String(snapshot.max_copies) + " copias/usos, conforme aplicavel.");

    section("4. ENTREGAVEIS");
    if (deliverables.length) deliverables.forEach((item, index) => line((index + 1) + ". " + item));
    else line("Arquivos disponibilizados na area autenticada do comprador.");

    section("5. PRECO E COMPROVANTE");
    line("Valor confirmado: " + money(Number.isSafeInteger(amountCents) && amountCents >= 0 ? amountCents : 0, currency) + ".");
    line("Pedido: " + String(snapshot.order_id ?? "Nao informado") + ".");
    line("Provedor: " + String(snapshot.provider ?? "Nao informado") + "; pagamento: " + String(snapshot.provider_payment_id ?? "Nao informado") + ".");
    line("Confirmacao: " + formatDate(snapshot.paid_at) + ".");

    section("6. LIMITACOES E TITULARIDADE");
    line("A licenca nao transfere autoria ou titularidade do beat, salvo cessao expressa em instrumento proprio. E vedada a revenda, sublicenca, distribuicao isolada ou registro do beat como obra integral do licenciado. O uso deve respeitar os direitos concedidos acima, direitos de terceiros e a legislacao aplicavel.");

    section("7. VALIDADE E EVIDENCIA");
    line("Este documento foi emitido eletronicamente apos confirmacao do pagamento. O numero do contrato, os IDs da transacao e o hash dos termos permitem correlacionar o documento ao registro auditavel mantido pela plataforma. Alteracoes futuras na oferta comercial nao modificam este snapshot contratual.");

    section("8. ACEITE");
    line("O licenciado aceitou os termos da modalidade no fluxo de compra. A emissao digital registra a data, as partes, o objeto e as condicoes vigentes no momento da transacao.");

    y -= 14;
    line("Documento gerado automaticamente pela plataforma Vivendo da Musica.", 8);
    const bytes = await pdf.save();

    const { error: auditError } = await admin
      .from("beat_license_purchases")
      .update({
        document_downloaded_at: new Date().toISOString(),
        document_download_count: Number(purchase.document_download_count ?? 0) + 1,
      })
      .eq("id", purchase.id);
    if (auditError) {
      return protectedJson({ error: "Não foi possível registrar o download do contrato." }, 500);
    }

    const safeContractNumber = String(purchase.contract_number)
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-|-$/g, "") || "contrato-beat";
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${safeContractNumber}.pdf"`,
        "Content-Type": "application/pdf",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("get-beat-license-contract failed", error);
    return protectedJson({ error: "Não foi possível gerar o contrato." }, 500);
  }
});
