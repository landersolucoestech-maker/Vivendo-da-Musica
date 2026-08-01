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
  const productIds = Array.isArray(body.productIds)
    ? [...new Set(body.productIds.filter((id: unknown) => typeof id === 'string'))]
    : [];
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!productIds.length || !idempotencyKey) return reply({ error: 'Produtos e chave de idempotência são obrigatórios.' }, 400);

  const { data: existing } = await admin.from('digital_product_orders').select('id')
    .eq('provider', 'development').eq('provider_reference', idempotencyKey).maybeSingle();
  if (existing) {
    const origin = request.headers.get('origin') ?? 'http://127.0.0.1:8083';
    return reply({ checkoutUrl: `${origin}/pagamento-sucesso?pedido=${existing.id}&tipo=produto`, orderId: existing.id, reused: true });
  }

  const { data: products, error: productError } = await admin.from('seller_products')
    .select('id,seller_id,title,price_cents,currency,status').in('id', productIds);
  if (productError) return reply({ error: productError.message }, 400);
  if (!products || products.length !== productIds.length || products.some((item) => item.status !== 'published')) {
    return reply({ error: 'Um ou mais produtos estão indisponíveis.' }, 409);
  }

  const currencies = [...new Set(products.map((item) => item.currency))];
  if (currencies.length !== 1) return reply({ error: 'Todos os produtos devem usar a mesma moeda.' }, 400);
  const total = products.reduce((sum, item) => sum + Number(item.price_cents), 0);
  const paidAt = new Date().toISOString();

  const { data: order, error: orderError } = await admin.from('digital_product_orders').insert({
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

  const { error: itemError } = await admin.from('digital_product_order_items').insert(products.map((product) => ({
    order_id: order.id,
    product_id: product.id,
    seller_id: product.seller_id,
    buyer_id: STUDENT_ID,
    product_title_snapshot: product.title,
    amount_cents: product.price_cents,
    currency: product.currency,
    status: 'paid',
    paid_at: paidAt,
  })));
  if (itemError) {
    await admin.from('digital_product_orders').delete().eq('id', order.id);
    return reply({ error: itemError.message }, 400);
  }

  const origin = request.headers.get('origin') ?? 'http://127.0.0.1:8083';
  return reply({ checkoutUrl: `${origin}/pagamento-sucesso?pedido=${order.id}&tipo=produto`, orderId: order.id });
});
