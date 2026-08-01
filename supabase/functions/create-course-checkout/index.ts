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
  const courseIds = Array.isArray(body.courseIds)
    ? [...new Set(body.courseIds.filter((id: unknown) => typeof id === 'string'))]
    : [];
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  if (!courseIds.length || !idempotencyKey) return reply({ error: 'Cursos e chave de idempotência são obrigatórios.' }, 400);

  const { data: existing } = await admin.from('course_orders').select('id')
    .eq('provider', 'development').eq('provider_reference', idempotencyKey).maybeSingle();
  if (existing) {
    const origin = request.headers.get('origin') ?? 'http://127.0.0.1:8083';
    return reply({ checkoutUrl: `${origin}/pagamento-sucesso?pedido=${existing.id}&tipo=curso`, orderId: existing.id, reused: true });
  }

  const { data: courses, error: courseError } = await admin.from('courses')
    .select('id,title,price_cents,currency,status,visibility').in('id', courseIds);
  if (courseError) return reply({ error: courseError.message }, 400);
  if (!courses || courses.length !== courseIds.length || courses.some((course) => course.status !== 'published')) {
    return reply({ error: 'Um ou mais cursos estão indisponíveis.' }, 409);
  }

  const currencies = [...new Set(courses.map((course) => course.currency))];
  if (currencies.length !== 1) return reply({ error: 'Todos os cursos devem usar a mesma moeda.' }, 400);
  const total = courses.reduce((sum, course) => sum + Number(course.price_cents), 0);
  const paidAt = new Date().toISOString();

  const { data: order, error: orderError } = await admin.from('course_orders').insert({
    user_id: STUDENT_ID,
    status: 'paid',
    provider: 'development',
    provider_reference: idempotencyKey,
    amount_cents: total,
    currency: currencies[0],
    is_demo: true,
    paid_at: paidAt,
  }).select('id').single();
  if (orderError || !order) return reply({ error: orderError?.message ?? 'Falha ao criar o pedido.' }, 400);

  const { error: itemError } = await admin.from('course_order_items').insert(courses.map((course) => ({
    order_id: order.id,
    course_id: course.id,
    course_title_snapshot: course.title,
    amount_cents: course.price_cents,
    currency: course.currency,
  })));
  if (itemError) {
    await admin.from('course_orders').delete().eq('id', order.id);
    return reply({ error: itemError.message }, 400);
  }

  for (const course of courses) {
    await admin.from('enrollments').upsert({
      user_id: STUDENT_ID,
      course_id: course.id,
      status: 'active',
      enrolled_at: paidAt,
    }, { onConflict: 'user_id,course_id' });
  }

  const origin = request.headers.get('origin') ?? 'http://127.0.0.1:8083';
  return reply({ checkoutUrl: `${origin}/pagamento-sucesso?pedido=${order.id}&tipo=curso`, orderId: order.id });
});
