import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthContext } from "../_shared/authContext.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asStrings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const money = (cents: number, currency: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
const date = (value: unknown) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(String(value))) : "Nao informado";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { userId } = await getAuthContext(req);
    const body = await req.json().catch(() => ({}));
    const purchaseId = typeof body.purchaseId === "string" ? body.purchaseId : "";
    if (!UUID_PATTERN.test(purchaseId)) return json({ error: "Invalid purchase id" }, 400);

    const admin = getAdminClient();
    const { data: purchase, error } = await admin
      .from("beat_license_purchases")
      .select("id, buyer_id, producer_id, status, issued_at, contract_number, contract_hash, license_snapshot, document_download_count")
      .eq("id", purchaseId)
      .maybeSingle();
    if (error) throw error;
    if (!purchase || purchase.buyer_id !== userId) return json({ error: "Contract not found" }, 404);
    if (purchase.status !== "active") return json({ error: "License is not active" }, 403);

    const { data: buyerAuth } = await admin.auth.admin.getUserById(purchase.buyer_id);
    const { data: producerAuth } = await admin.auth.admin.getUserById(purchase.producer_id);
    const { data: profiles } = await admin.from("user_profiles").select("user_id, full_name").in("user_id", [purchase.buyer_id, purchase.producer_id]);
    const buyerName = profiles?.find((profile) => profile.user_id === purchase.buyer_id)?.full_name || buyerAuth.user?.email || purchase.buyer_id;
    const producerName = profiles?.find((profile) => profile.user_id === purchase.producer_id)?.full_name || producerAuth.user?.email || purchase.producer_id;
    const snapshot = purchase.license_snapshot as Record<string, unknown>;
    const rights = asStrings(snapshot.usage_rights);
    const deliverables = asStrings(snapshot.deliverables);

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595.28, 841.89]);
    let y = 795;
    const margin = 48;
    const width = 499;
    const addPage = () => { page = pdf.addPage([595.28, 841.89]); y = 795; };
    const line = (text: string, size = 10, isBold = false, gap = 5) => {
      const font = isBold ? bold : regular;
      const words = text.replace(/\s+/g, " ").trim().split(" ");
      let current = "";
      const rows: string[] = [];
      for (const word of words) {
        const candidate = current ? current + " " + word : word;
        if (font.widthOfTextAtSize(candidate, size) > width && current) {
          rows.push(current); current = word;
        } else current = candidate;
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
    line("Contrato: " + purchase.contract_number, 10, true);
    line("Emitido em: " + date(purchase.issued_at));
    line("Hash SHA-256 dos termos: " + purchase.contract_hash, 8);

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
    line("Valor confirmado: " + money(Number(snapshot.amount_cents ?? 0), String(snapshot.currency ?? "BRL")) + ".");
    line("Pedido: " + String(snapshot.order_id ?? "Nao informado") + ".");
    line("Provedor: " + String(snapshot.provider ?? "Nao informado") + "; pagamento: " + String(snapshot.provider_payment_id ?? "Nao informado") + ".");
    line("Confirmacao: " + date(snapshot.paid_at) + ".");

    section("6. LIMITACOES E TITULARIDADE");
    line("A licenca nao transfere autoria ou titularidade do beat, salvo cessao expressa em instrumento proprio. E vedada a revenda, sublicenca, distribuicao isolada ou registro do beat como obra integral do licenciado. O uso deve respeitar os direitos concedidos acima, direitos de terceiros e a legislacao aplicavel.");

    section("7. VALIDADE E EVIDENCIA");
    line("Este documento foi emitido eletronicamente apos confirmacao do pagamento. O numero do contrato, os IDs da transacao e o hash dos termos permitem correlacionar o documento ao registro auditavel mantido pela plataforma. Alteracoes futuras na oferta comercial nao modificam este snapshot contratual.");

    section("8. ACEITE");
    line("O licenciado aceitou os termos da modalidade no fluxo de compra. A emissao digital registra a data, as partes, o objeto e as condicoes vigentes no momento da transacao.");

    y -= 14;
    line("Documento gerado automaticamente pela plataforma Vivendo da Musica.", 8);
    const bytes = await pdf.save();

    const { error: auditError } = await admin.from("beat_license_purchases").update({
      document_downloaded_at: new Date().toISOString(),
      document_download_count: purchase.document_download_count ? purchase.document_download_count + 1 : 1,
    }).eq("id", purchase.id);
    if (auditError) throw auditError;

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + purchase.contract_number + '.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unexpected contract error" }, 500);
  }
});

