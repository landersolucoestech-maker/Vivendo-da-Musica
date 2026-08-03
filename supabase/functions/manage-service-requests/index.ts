import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const DEV_REF = 'ywirfqvobfnunlcsnptm';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Body {
  action?: unknown;
  actingUserId?: unknown;
  requestId?: unknown;
  proposalId?: unknown;
  categoryId?: unknown;
  listingId?: unknown;
  title?: unknown;
  brief?: unknown;
  budgetMinCents?: unknown;
  budgetMaxCents?: unknown;
  currency?: unknown;
  desiredDeliveryDate?: unknown;
  amountCents?: unknown;
  deliveryDays?: unknown;
  revisions?: unknown;
  scope?: unknown;
  deliverables?: unknown;
}

const reply = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
});

const allowedOrigins = () => (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('DEV_ALLOWED_ORIGINS') ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean);
const resolveOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (allowedOrigins().includes(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return origin;
  } catch { return null; }
  return null;
};
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const uuid = (value: unknown) => typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
const integer = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
const strings = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, 20)
  : [];

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('origin');
  const origin = resolveOrigin(request);
  if (requestOrigin && !origin) return reply({ error: 'Origem não autorizada.' }, 403, null);
  if (request.method === 'OPTIONS') return reply({ ok: true }, 200, origin);
  if (request.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !serviceKey || !publishableKey) return reply({ error: 'Ambiente indisponível.' }, 503, origin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await request.json().catch(() => ({})) as Body;
  const authorization = request.headers.get('authorization');
  let userId: string | null = null;
  let isDemoPreview = false;

  if (authorization) {
    const client = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data } = await client.auth.getUser();
    userId = data.user?.id ?? null;
  }

  if (!userId && supabaseUrl.includes(DEV_REF)) {
    const actingUserId = uuid(body.actingUserId);
    if (actingUserId) {
      const { data } = await admin.from('user_profiles').select('user_id').eq('user_id', actingUserId).eq('is_demo', true).maybeSingle();
      userId = data?.user_id ?? null;
      isDemoPreview = Boolean(userId);
    }
  }

  if (!userId) return reply({ error: 'Autenticação obrigatória.' }, 401, origin);
  const action = text(body.action, 40);

  if (action === 'create_request') {
    const categoryId = uuid(body.categoryId);
    const listingId = uuid(body.listingId);
    const title = text(body.title, 140);
    const brief = text(body.brief, 10000);
    const budgetMinCents = Math.max(0, integer(body.budgetMinCents));
    const budgetMaxCents = Math.max(0, integer(body.budgetMaxCents));
    const currency = text(body.currency, 3).toUpperCase() || 'BRL';
    const desiredDeliveryDate = text(body.desiredDeliveryDate, 10) || null;
    if (!categoryId || title.length < 3 || brief.length < 20) return reply({ error: 'Categoria, título e briefing completo são obrigatórios.' }, 400, origin);
    if (budgetMaxCents && budgetMinCents > budgetMaxCents) return reply({ error: 'O orçamento máximo deve ser maior ou igual ao mínimo.' }, 400, origin);

    const { data, error } = await admin.from('service_requests').insert({
      client_id: userId,
      category_id: categoryId,
      listing_id: listingId,
      title,
      brief,
      budget_min_cents: budgetMinCents || null,
      budget_max_cents: budgetMaxCents || null,
      currency,
      desired_delivery_date: desiredDeliveryDate,
      status: 'open',
      is_demo: isDemoPreview,
    }).select('id').single();
    if (error || !data) return reply({ error: error?.message ?? 'Solicitação não criada.' }, 400, origin);
    return reply({ id: data.id }, 201, origin);
  }

  if (action === 'submit_proposal') {
    const requestId = uuid(body.requestId);
    const amountCents = integer(body.amountCents, -1);
    const deliveryDays = integer(body.deliveryDays);
    const revisions = integer(body.revisions);
    const scope = text(body.scope, 10000);
    const deliverables = strings(body.deliverables);
    if (!requestId || amountCents < 0 || deliveryDays <= 0 || revisions < 0 || scope.length < 20) return reply({ error: 'Valor, prazo e escopo completo são obrigatórios.' }, 400, origin);

    const { data: capability } = await admin.from('account_capabilities').select('capability')
      .eq('user_id', userId).in('capability', ['producer', 'instructor']).eq('status', 'active').limit(1).maybeSingle();
    if (!capability) return reply({ error: 'Ative o ambiente de produtor ou instrutor para enviar propostas.' }, 403, origin);
    const { data: serviceRequest } = await admin.from('service_requests').select('id,status,currency').eq('id', requestId).maybeSingle();
    if (!serviceRequest || serviceRequest.status !== 'open') return reply({ error: 'Esta solicitação não aceita novas propostas.' }, 409, origin);

    const { data, error } = await admin.from('service_proposals').upsert({
      request_id: requestId,
      provider_id: userId,
      amount_cents: amountCents,
      currency: serviceRequest.currency,
      delivery_days: deliveryDays,
      revisions,
      scope,
      deliverables,
      status: 'submitted',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'request_id,provider_id' }).select('id').single();
    if (error || !data) return reply({ error: error?.message ?? 'Proposta não enviada.' }, 400, origin);
    return reply({ id: data.id }, 200, origin);
  }

  if (action === 'accept_proposal') {
    const requestId = uuid(body.requestId);
    const proposalId = uuid(body.proposalId);
    if (!requestId || !proposalId) return reply({ error: 'Solicitação ou proposta inválida.' }, 400, origin);
    const { data: serviceRequest } = await admin.from('service_requests').select('client_id').eq('id', requestId).maybeSingle();
    if (!serviceRequest || serviceRequest.client_id !== userId) return reply({ error: 'Apenas o cliente pode escolher a proposta.' }, 403, origin);
    const { data, error } = await admin.rpc('service_accept_service_proposal', {
      target_request_id: requestId,
      target_proposal_id: proposalId,
      target_buyer_id: userId,
    });
    if (error) return reply({ error: error.message }, 400, origin);
    return reply({ offerId: data }, 200, origin);
  }

  if (action === 'cancel_request') {
    const requestId = uuid(body.requestId);
    const { error } = await admin.from('service_requests').update({ status: 'canceled' }).eq('id', requestId).eq('client_id', userId).eq('status', 'open');
    if (error) return reply({ error: error.message }, 400, origin);
    return reply({ success: true }, 200, origin);
  }

  if (action === 'withdraw_proposal') {
    const proposalId = uuid(body.proposalId);
    const { error } = await admin.from('service_proposals').update({ status: 'withdrawn' }).eq('id', proposalId).eq('provider_id', userId).eq('status', 'submitted');
    if (error) return reply({ error: error.message }, 400, origin);
    return reply({ success: true }, 200, origin);
  }

  return reply({ error: 'Ação não suportada.' }, 400, origin);
});
