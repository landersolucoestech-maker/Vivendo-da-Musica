import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const DEV_REF = 'ywirfqvobfnunlcsnptm';
const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const MAX_ITEMS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9:_-]{16,128}$/;
const REFERRAL_PATTERN = /^[a-z0-9][a-z0-9-]{2,79}$/;

function resolveOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const configured = (Deno.env.get('DEV_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (configured.includes(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return origin;
  } catch {
    return null;
  }
  return null;
}

function headers(origin: string | null): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

const reply = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: headers(origin) });

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('origin');
  const origin = resolveOrigin(request);
  if (requestOrigin && !origin) return reply({ error: 'Origem não autorizada.' }, 403, null);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(origin) });
  if (request.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405, origin);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url.includes(DEV_REF) || !serviceKey) return reply({ error: 'Checkout de desenvolvimento indisponível neste projeto.' }, 503, origin);

  const body = await request.json().catch(() => ({}));
  const productIds = Array.isArray(body.productIds)
    ? [...new Set(body.productIds.filter((id: unknown): id is string => typeof id === 'string' && UUID_PATTERN.test(id)))]
    : [];
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  const rawReferralSlug = typeof body.referralSlug === 'string' ? body.referralSlug.trim().toLowerCase() : '';
  const referralSlug = REFERRAL_PATTERN.test(rawReferralSlug) ? rawReferralSlug : null;
  if (!productIds.length || productIds.length > MAX_ITEMS || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return reply({ error: 'Produtos ou chave de idempotência inválidos.' }, 400, origin);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const registerReferral = async (orderId: string) => {
    if (!referralSlug) return;
    await admin.rpc('record_affiliate_checkout_conversion', {
      target_order_id: orderId,
      target_order_kind: 'digital_product',
      target_referral_slug: referralSlug,
    });
  };

  const { data: existing } = await admin.from('digital_product_orders').select('id')
    .eq('provider', 'development').eq('provider_reference', idempotencyKey).maybeSingle();
  const appOrigin = origin ?? 'http://127.0.0.1:8083';
  if (existing) {
    await registerReferral(existing.id);
    return reply({ checkoutUrl: `${appOrigin}/pagamento-sucesso?pedido=${existing.id}&tipo=produto`, orderId: existing.id, reused: true }, 200, origin);
  }

  const { data: products, error: productError } = await admin.from('seller_products')
    .select('id,seller_id,title,price_cents,currency,status').in('id', productIds);
  if (productError) return reply({ error: productError.message }, 400, origin);
  if (!products || products.length !== productIds.length || products.some((item) => item.status !== 'published')) {
    return reply({ error: 'Um ou mais produtos estão indisponíveis.' }, 409, origin);
  }

  const currencies = [...new Set(products.map((item) => item.currency))];
  if (currencies.length !== 1) return reply({ error: 'Todos os produtos devem usar a mesma moeda.' }, 400, origin);
  const total = products.reduce((sum, item) => sum + Number(item.price_cents), 0);
  if (!Number.isSafeInteger(total) || total < 0) return reply({ error: 'Total inválido.' }, 400, origin);
  const paidAt = new Date().toISOString();

  const { data: order, error: orderError } = await admin.from('digital_product_orders').insert({
    buyer_id: STUDENT_ID, status: 'paid', provider: 'development', provider_reference: idempotencyKey,
    amount_cents: total, currency: currencies[0], is_demo: true, paid_at: paidAt,
  }).select('id').single();
  if (orderError || !order) return reply({ error: orderError?.message ?? 'Falha ao criar o pedido.' }, 400, origin);

  const { error: itemError } = await admin.from('digital_product_order_items').insert(products.map((product) => ({
    order_id: order.id, product_id: product.id, seller_id: product.seller_id, buyer_id: STUDENT_ID,
    product_title_snapshot: product.title, amount_cents: product.price_cents, currency: product.currency,
    status: 'paid', paid_at: paidAt,
  })));
  if (itemError) {
    await admin.from('digital_product_orders').delete().eq('id', order.id);
    return reply({ error: itemError.message }, 400, origin);
  }

  await registerReferral(order.id);
  return reply({ checkoutUrl: `${appOrigin}/pagamento-sucesso?pedido=${order.id}&tipo=produto`, orderId: order.id }, 200, origin);
});
