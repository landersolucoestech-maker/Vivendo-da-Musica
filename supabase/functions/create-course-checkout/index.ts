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
  const courseIds = Array.isArray(body.courseIds)
    ? [...new Set(body.courseIds.filter((id: unknown): id is string => typeof id === 'string' && UUID_PATTERN.test(id)))]
    : [];
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  const rawReferralSlug = typeof body.referralSlug === 'string' ? body.referralSlug.trim().toLowerCase() : '';
  const referralSlug = REFERRAL_PATTERN.test(rawReferralSlug) ? rawReferralSlug : null;
  if (!courseIds.length || courseIds.length > MAX_ITEMS || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return reply({ error: 'Cursos ou chave de idempotência inválidos.' }, 400, origin);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const registerReferral = async (orderId: string) => {
    if (!referralSlug) return;
    await admin.rpc('record_affiliate_checkout_conversion', {
      target_order_id: orderId,
      target_order_kind: 'course',
      target_referral_slug: referralSlug,
    });
  };

  const { data: existing } = await admin.from('course_orders').select('id')
    .eq('provider', 'development').eq('provider_reference', idempotencyKey).maybeSingle();
  const appOrigin = origin ?? 'http://127.0.0.1:8083';
  if (existing) {
    await registerReferral(existing.id);
    return reply({ checkoutUrl: `${appOrigin}/pagamento-sucesso?pedido=${existing.id}&tipo=curso`, orderId: existing.id, reused: true }, 200, origin);
  }

  const { data: courses, error: courseError } = await admin.from('courses')
    .select('id,title,price_cents,currency,status,visibility,is_demo').in('id', courseIds);
  if (courseError) return reply({ error: courseError.message }, 400, origin);
  if (
    !courses
    || courses.length !== courseIds.length
    || courses.some((course) => course.status !== 'published' || !course.is_demo)
  ) {
    return reply({ error: 'Um ou mais cursos estão indisponíveis para o ambiente de demonstração.' }, 409, origin);
  }

  const currencies = [...new Set(courses.map((course) => course.currency))];
  if (currencies.length !== 1) return reply({ error: 'Todos os cursos devem usar a mesma moeda.' }, 400, origin);
  const total = courses.reduce((sum, course) => sum + Number(course.price_cents), 0);
  if (!Number.isSafeInteger(total) || total < 0) return reply({ error: 'Total inválido.' }, 400, origin);
  const paidAt = new Date().toISOString();

  const { data: order, error: orderError } = await admin.from('course_orders').insert({
    user_id: STUDENT_ID, status: 'paid', provider: 'development', provider_reference: idempotencyKey,
    amount_cents: total, currency: currencies[0], is_demo: true, paid_at: paidAt,
  }).select('id').single();
  if (orderError || !order) return reply({ error: orderError?.message ?? 'Falha ao criar o pedido.' }, 400, origin);

  const { error: itemError } = await admin.from('course_order_items').insert(courses.map((course) => ({
    order_id: order.id, course_id: course.id, course_title_snapshot: course.title,
    amount_cents: course.price_cents, currency: course.currency,
  })));
  if (itemError) {
    await admin.from('course_orders').delete().eq('id', order.id);
    return reply({ error: itemError.message }, 400, origin);
  }

  for (const course of courses) {
    await admin.from('enrollments').upsert({
      user_id: STUDENT_ID, course_id: course.id, status: 'active', enrolled_at: paidAt,
    }, { onConflict: 'user_id,course_id' });
  }

  await registerReferral(order.id);
  return reply({ checkoutUrl: `${appOrigin}/pagamento-sucesso?pedido=${order.id}&tipo=curso`, orderId: order.id }, 200, origin);
});
