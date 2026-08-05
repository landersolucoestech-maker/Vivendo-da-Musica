import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const DEV_PROJECT_REF = 'ywirfqvobfnunlcsnptm';
const MAX_REQUEST_BYTES = 16_384;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEAT_BUCKETS = new Set(['beat-masters', 'beat-stems']);
const CONTRACT_BUCKET = 'beat-license-contracts';
const emptyZip = new Uint8Array([80, 75, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const emptyWav = new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0, 2, 0, 16, 0, 100, 97, 116, 97, 0, 0, 0, 0]);

class PayloadTooLargeError extends Error {}

function resolveOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const configured = (Deno.env.get('DEV_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return origin;
  } catch {
    return null;
  }
  return null;
}

function responseHeaders(origin: string | null): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': 'application/json; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });

const readJsonWithLimit = async (request: Request, maxBytes: number) => {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PayloadTooLargeError('Payload excede o limite permitido.');
  }

  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('payload_too_large');
        throw new PayloadTooLargeError('Payload excede o limite permitido.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const parsed = JSON.parse(new TextDecoder().decode(merged)) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
};

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('origin');
  const origin = resolveOrigin(request);
  if (requestOrigin && !origin) return json({ error: 'Origem não autorizada.' }, 403, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, origin);

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return json({ error: 'Tipo de conteúdo não suportado.' }, 415, origin);
  }

  try {
    let body: Record<string, unknown> | null;
    try {
      body = await readJsonWithLimit(request, MAX_REQUEST_BYTES);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return json({ error: error.message }, 413, origin);
      }
      return json({ error: 'JSON inválido.' }, 400, origin);
    }

    const kind = body?.kind;
    const id = body?.id;
    const action = body?.action ?? 'download';
    if (!['beat', 'product'].includes(String(kind)) || typeof id !== 'string' || !UUID_PATTERN.test(id) || !['download', 'contract'].includes(String(action))) {
      return json({ error: 'Solicitação inválida.' }, 400, origin);
    }
    if (kind === 'product' && action === 'contract') return json({ error: 'Ação indisponível para produtos.' }, 400, origin);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!url || !serviceKey || !anonKey) return json({ error: 'Configuração indisponível.' }, 500, origin);

    const isDevProject = url.includes(DEV_PROJECT_REF);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const authHeader = request.headers.get('Authorization');
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      if (!authHeader.startsWith('Bearer ')) return json({ error: 'Credencial inválida.' }, 401, origin);
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data, error } = await userClient.auth.getUser();
      if (error || !data.user) return json({ error: 'Sessão inválida ou expirada.' }, 401, origin);
      authenticatedUserId = data.user.id;
    } else if (!isDevProject) {
      return json({ error: 'Autenticação obrigatória.' }, 401, origin);
    }

    if (kind === 'beat') {
      const { data, error } = await admin
        .from('beat_deliveries')
        .select('id,storage_bucket,storage_path,file_label,expires_at,download_count,purchase:beat_license_purchases!inner(id,buyer_id,contract_number,status,issued_at,beat:beats!inner(title,is_demo),license:beat_licenses!inner(name,usage_rights,deliverables,license_contract_path,license_contract_file_name,license_contract_mime_type,license_contract_size_bytes,license_contract_updated_at))')
        .eq('id', id)
        .single();
      if (error || !data) return json({ error: 'Entrega não encontrada.' }, 404, origin);
      if (!BEAT_BUCKETS.has(data.storage_bucket)) return json({ error: 'Destino de arquivo inválido.' }, 409, origin);

      const purchase = data.purchase as unknown as {
        buyer_id: string | null;
        contract_number: string;
        status: string;
        issued_at: string;
        beat: { title: string; is_demo: boolean };
        license: {
          name: string;
          usage_rights: unknown;
          deliverables: unknown;
          license_contract_path: string | null;
          license_contract_file_name: string | null;
          license_contract_mime_type: string | null;
          license_contract_size_bytes: number | null;
          license_contract_updated_at: string | null;
        };
      };
      const demoAccess = isDevProject && purchase.beat.is_demo;
      const ownerAccess = Boolean(authenticatedUserId && purchase.buyer_id === authenticatedUserId);
      if (purchase.status !== 'active' || (!demoAccess && !ownerAccess)) return json({ error: 'Acesso negado.' }, 403, origin);

      if (action === 'contract') {
        if (purchase.license.license_contract_path && purchase.license.license_contract_file_name) {
          const signed = await admin.storage
            .from(CONTRACT_BUCKET)
            .createSignedUrl(purchase.license.license_contract_path, 300, {
              download: purchase.license.license_contract_file_name,
            });
          if (signed.error || !signed.data?.signedUrl) {
            return json({ error: 'O contrato enviado pelo produtor não está disponível no Storage.' }, 404, origin);
          }

          return json({
            contractNumber: purchase.contract_number,
            issuedAt: purchase.issued_at,
            beatTitle: purchase.beat.title,
            licenseName: purchase.license.name,
            usageRights: purchase.license.usage_rights,
            deliverables: purchase.license.deliverables,
            url: signed.data.signedUrl,
            fileName: purchase.license.license_contract_file_name,
            mimeType: purchase.license.license_contract_mime_type,
            sizeBytes: purchase.license.license_contract_size_bytes,
            uploadedAt: purchase.license.license_contract_updated_at,
            source: 'producer_upload',
          }, 200, origin);
        }

        return json({
          contractNumber: purchase.contract_number,
          issuedAt: purchase.issued_at,
          beatTitle: purchase.beat.title,
          licenseName: purchase.license.name,
          usageRights: purchase.license.usage_rights,
          deliverables: purchase.license.deliverables,
          source: 'generated_fallback',
        }, 200, origin);
      }

      if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return json({ error: 'O prazo deste download expirou.' }, 410, origin);

      let signed = await admin.storage.from(data.storage_bucket).createSignedUrl(data.storage_path, 300, { download: data.file_label });
      if ((signed.error || !signed.data?.signedUrl) && demoAccess) {
        const upload = await admin.storage.from(data.storage_bucket).upload(data.storage_path, emptyWav, {
          contentType: 'audio/wav',
          upsert: true,
        });
        if (upload.error) return json({ error: 'Não foi possível materializar o arquivo sintético.' }, 500, origin);
        signed = await admin.storage.from(data.storage_bucket).createSignedUrl(data.storage_path, 300, { download: data.file_label });
      }
      if (signed.error || !signed.data?.signedUrl) return json({ error: 'Arquivo indisponível no Storage.' }, 404, origin);

      await admin.from('beat_deliveries').update({
        downloaded_at: new Date().toISOString(),
        download_count: Number(data.download_count ?? 0) + 1,
      }).eq('id', data.id);
      return json({ url: signed.data.signedUrl, expiresIn: 300 }, 200, origin);
    }

    const { data, error } = await admin
      .from('seller_product_files')
      .select('id,storage_path,file_name,product:seller_products!inner(id,title,is_demo,orders:digital_product_order_items!inner(id,buyer_id,status,paid_at))')
      .eq('id', id)
      .eq('product.orders.status', 'paid')
      .limit(1)
      .single();
    if (error || !data) return json({ error: 'Arquivo não encontrado.' }, 404, origin);

    const product = data.product as unknown as {
      is_demo: boolean;
      orders: Array<{ buyer_id: string | null }>;
    };
    const demoAccess = isDevProject && product.is_demo;
    const ownerAccess = product.orders.some((order) => Boolean(authenticatedUserId && order.buyer_id === authenticatedUserId));
    if (!demoAccess && !ownerAccess) return json({ error: 'Acesso negado.' }, 403, origin);

    let signed = await admin.storage.from('seller-product-files').createSignedUrl(data.storage_path, 300, { download: data.file_name });
    if ((signed.error || !signed.data?.signedUrl) && demoAccess) {
      const upload = await admin.storage.from('seller-product-files').upload(data.storage_path, emptyZip, {
        contentType: 'application/zip',
        upsert: true,
      });
      if (upload.error) return json({ error: 'Não foi possível materializar o arquivo sintético.' }, 500, origin);
      signed = await admin.storage.from('seller-product-files').createSignedUrl(data.storage_path, 300, { download: data.file_name });
    }
    if (signed.error || !signed.data?.signedUrl) return json({ error: 'Arquivo indisponível no Storage.' }, 404, origin);
    return json({ url: signed.data.signedUrl, expiresIn: 300 }, 200, origin);
  } catch {
    return json({ error: 'Não foi possível processar a solicitação.' }, 500, origin);
  }
});
