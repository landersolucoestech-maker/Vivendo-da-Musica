import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const emptyZip = new Uint8Array([80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
const emptyWav = new Uint8Array([82,73,70,70,36,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,68,172,0,0,136,88,1,0,2,0,16,0,100,97,116,97,0,0,0,0]);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const { kind, id, action = 'download' } = await request.json();
    if (!['beat', 'product'].includes(kind) || typeof id !== 'string') return json({ error: 'Solicitação inválida.' }, 400);
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !serviceKey || !anonKey) return json({ error: 'Configuração indisponível.' }, 500);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const authHeader = request.headers.get('Authorization');
    let authenticatedUserId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
      const { data } = await userClient.auth.getUser();
      authenticatedUserId = data.user?.id ?? null;
    }

    if (kind === 'beat') {
      const { data, error } = await admin.from('beat_deliveries')
        .select('id,storage_bucket,storage_path,file_label,expires_at,download_count,purchase:beat_license_purchases!inner(id,buyer_id,contract_number,status,issued_at,beat:beats!inner(title,is_demo),license:beat_licenses!inner(name,usage_rights,deliverables))')
        .eq('id', id).single();
      if (error || !data) return json({ error: 'Entrega não encontrada.' }, 404);
      const purchase = data.purchase as unknown as { id: string; buyer_id: string | null; contract_number: string; status: string; issued_at: string; beat: { title: string; is_demo: boolean }; license: { name: string; usage_rights: unknown; deliverables: unknown } };
      const allowed = purchase.status === 'active' && (purchase.beat.is_demo || (authenticatedUserId && purchase.buyer_id === authenticatedUserId));
      if (!allowed) return json({ error: 'Acesso negado.' }, 403);
      if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return json({ error: 'O prazo deste download expirou.' }, 410);
      if (action === 'contract') return json({ contractNumber: purchase.contract_number, issuedAt: purchase.issued_at, beatTitle: purchase.beat.title, licenseName: purchase.license.name, usageRights: purchase.license.usage_rights, deliverables: purchase.license.deliverables });

      let signed = await admin.storage.from(data.storage_bucket).createSignedUrl(data.storage_path, 300, { download: data.file_label });
      if ((signed.error || !signed.data?.signedUrl) && purchase.beat.is_demo) {
        const upload = await admin.storage.from(data.storage_bucket).upload(data.storage_path, emptyWav, { contentType: 'audio/wav', upsert: true });
        if (upload.error) return json({ error: 'Não foi possível materializar o arquivo sintético.' }, 500);
        signed = await admin.storage.from(data.storage_bucket).createSignedUrl(data.storage_path, 300, { download: data.file_label });
      }
      if (signed.error || !signed.data?.signedUrl) return json({ error: 'Arquivo indisponível no Storage.' }, 404);
      await admin.from('beat_deliveries').update({ downloaded_at: new Date().toISOString(), download_count: data.download_count + 1 }).eq('id', data.id);
      return json({ url: signed.data.signedUrl, expiresIn: 300 });
    }

    const { data, error } = await admin.from('seller_product_files')
      .select('id,storage_path,file_name,product:seller_products!inner(id,title,is_demo,orders:digital_product_order_items!inner(id,buyer_id,status,paid_at))')
      .eq('id', id).eq('product.orders.status', 'paid').limit(1).single();
    if (error || !data) return json({ error: 'Arquivo não encontrado.' }, 404);
    const product = data.product as unknown as { title: string; is_demo: boolean; orders: Array<{ buyer_id: string | null; status: string; paid_at: string | null }> };
    const allowed = product.is_demo || product.orders.some((order) => authenticatedUserId && order.buyer_id === authenticatedUserId);
    if (!allowed) return json({ error: 'Acesso negado.' }, 403);
    let signed = await admin.storage.from('seller-product-files').createSignedUrl(data.storage_path, 300, { download: data.file_name });
    if ((signed.error || !signed.data?.signedUrl) && product.is_demo) {
      const upload = await admin.storage.from('seller-product-files').upload(data.storage_path, emptyZip, { contentType: 'application/zip', upsert: true });
      if (upload.error) return json({ error: 'Não foi possível materializar o arquivo sintético.' }, 500);
      signed = await admin.storage.from('seller-product-files').createSignedUrl(data.storage_path, 300, { download: data.file_name });
    }
    if (signed.error || !signed.data?.signedUrl) return json({ error: 'Arquivo indisponível no Storage.' }, 404);
    return json({ url: signed.data.signedUrl, expiresIn: 300 });
  } catch {
    return json({ error: 'Não foi possível processar a solicitação.' }, 500);
  }
});
