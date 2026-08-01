import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const DEV_REF = 'ywirfqvobfnunlcsnptm';
const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  if (!url.includes(DEV_REF)) return reply({ error: 'Checkout de desenvolvimento indisponível neste projeto.' }, 503);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
  const body = await request.json().catch(() => ({}));
  const licenseIds = Array.isArray(body.licenseIds)
    ? [...new Set(body.licenseIds.filter((id: unknown) => typeof id === 'string'))]
    : [];
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!licenseIds.length || !idempotencyKey) return reply({ error: 'Licenças e chave de idempotência são obrigatórias.' }, 400);

  const { data: existing } = await admin.from('beat_orders').select('id')
    .eq('provider', 'development').eq('provider_reference', idempotencyKey).maybeSingle();
  if (existing) {
    const origin = request.headers.get('origin') ?? 'http://127.0.0.1:8083';
    return reply({ checkoutUrl: `${origin}/pagamento-sucesso?pedido=${existing.id}&tipo=beat`, orderId: existing.id, reused: true });
  }

  const { data: licenses, error: licenseError } = await admin.from('beat_licenses')
    .select('id,name,price_cents,currency,available,beat_id,beats!inner(id,title,producer_id,exclusive_available)')
    .in('id', licenseIds);
  if (licenseError) return reply({ error: licenseError.message }, 400);
  if (!licenses || licenses.length !== licenseIds.length || licenses.some((item) => !item.available)) {
    return reply({ error: 'Uma ou mais licenças estão indisponíveis.' }, 409);
  }

  const currencies = [...new Set(licenses.map((item) => item.currency))];
  if (currencies.length !== 1) return reply({ error: 'Todos os itens devem usar a mesma moeda.' }, 400);
  const total = licenses.reduce((sum, item) => sum + Number(item.price_cents), 0);
  const paidAt = new Date().toISOString();

  const { data: order, error: orderError } = await admin.from('beat_orders').insert({
    buyer_id: STUDENT_ID,
    status: 'paid',
    provider: 'development',
    provider_reference: idempotencyKey,
    amount_cents: total,
    currency: currencies[0],
    is_demo: true,
    paid_at: paidAt,
  }).select('id').single();
  if (orderError || !order) return reply({ error: orderError?.message ?? 'Falha ao criar o pedido.' }, 400);

  const items = licenses.map((license) => ({
    order_id: order.id,
    beat_id: license.beat_id,
    license_id: license.id,
    producer_id: license.beats.producer_id,
    buyer_id: STUDENT_ID,
    beat_title_snapshot: license.beats.title,
    license_name_snapshot: license.name,
    buyer_name_snapshot: 'Aluno de Desenvolvimento',
    amount_cents: license.price_cents,
    currency: license.currency,
    status: 'paid',
    paid_at: paidAt,
  }));
  const { data: insertedItems, error: itemError } = await admin.from('beat_order_items')
    .insert(items).select('id,beat_id,license_id');
  if (itemError || !insertedItems) {
    await admin.from('beat_orders').delete().eq('id', order.id);
    return reply({ error: itemError?.message ?? 'Falha ao criar os itens.' }, 400);
  }

  for (const item of insertedItems) {
    const contractNumber = `VDM-DEV-${item.id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const { data: purchase } = await admin.from('beat_license_purchases').insert({
      beat_order_item_id: item.id,
      beat_id: item.beat_id,
      license_id: item.license_id,
      buyer_id: STUDENT_ID,
      contract_number: contractNumber,
      status: 'active',
      issued_at: paidAt,
    }).select('id').single();
    if (!purchase) continue;

    const beat = licenses.find((license) => license.beat_id === item.beat_id);
    await admin.from('beat_deliveries').insert({
      purchase_id: purchase.id,
      file_label: 'Master WAV',
      storage_bucket: 'beat-masters',
      storage_path: `${beat?.beats.producer_id}/${item.beat_id}/master.wav`,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  }

  const origin = request.headers.get('origin') ?? 'http://127.0.0.1:8083';
  return reply({ checkoutUrl: `${origin}/pagamento-sucesso?pedido=${order.id}&tipo=beat`, orderId: order.id });
});
