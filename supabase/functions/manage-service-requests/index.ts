import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  readServiceJsonObject,
  resolveServiceOrigin,
  serviceOptions,
  serviceReply,
} from '../_shared/serviceEndpoint.ts';

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

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const uuid = (value: unknown) => typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
const integer = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isSafeInteger(value) ? value : fallback;
const strings = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, 20)
  : [];
const logDatabaseError = (event: string, error: { code?: string; details?: string; hint?: string } | null) => {
  if (error) console.error(event, { code: error.code, details: error.details, hint: error.hint });
};

Deno.serve(async (request) => {
  const { origin, blocked } = resolveServiceOrigin(request);
  if (blocked) return serviceReply({ error: 'Origem não autorizada.' }, 403, null);
  if (request.method === 'OPTIONS') return serviceOptions(origin);
  if (request.method !== 'POST') return serviceReply({ error: 'Método não permitido.' }, 405, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !serviceKey || !publishableKey) {
    return serviceReply({ error: 'Ambiente indisponível.' }, 503, origin);
  }

  const parsedBody = await readServiceJsonObject(request, origin);
  if (parsedBody instanceof Response) return parsedBody;
  const body = parsedBody as Body;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const authorization = request.headers.get('authorization');
  let userId: string | null = null;
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
      const { data } = await admin.from('user_profiles')
        .select('user_id')
        .eq('user_id', actingUserId)
        .eq('is_demo', true)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }
  }
  if (!userId) return serviceReply({ error: 'Autenticação obrigatória.' }, 401, origin);

  const { data: actorProfile, error: actorError } = await admin.from('user_profiles')
    .select('is_demo')
    .eq('user_id', userId)
    .maybeSingle();
  if (actorError || !actorProfile) {
    logDatabaseError('service request actor lookup failed', actorError);
    return serviceReply({ error: 'Não foi possível validar a conta.' }, 500, origin);
  }
  const actorIsDemo = Boolean(actorProfile.is_demo);
  const action = text(body.action, 40);

  if (action === 'create_request') {
    const categoryId = uuid(body.categoryId);
    const listingId = uuid(body.listingId);
    const title = text(body.title, 140);
    const brief = text(body.brief, 10000);
    const budgetMinCents = Math.max(0, integer(body.budgetMinCents));
    const budgetMaxCents = Math.max(0, integer(body.budgetMaxCents));
    const rawCurrency = text(body.currency, 3).toUpperCase() || 'BRL';
    const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : '';
    const desiredDeliveryDate = text(body.desiredDeliveryDate, 10) || null;
    if (!categoryId || title.length < 3 || brief.length < 20 || !currency) {
      return serviceReply({ error: 'Categoria, título, briefing e moeda válidos são obrigatórios.' }, 400, origin);
    }
    if (budgetMaxCents && budgetMinCents > budgetMaxCents) {
      return serviceReply({ error: 'O orçamento máximo deve ser maior ou igual ao mínimo.' }, 400, origin);
    }

    if (listingId) {
      const { data: listing, error: listingError } = await admin.from('service_listings')
        .select('id,category_id,is_demo')
        .eq('id', listingId)
        .maybeSingle();
      if (listingError) {
        logDatabaseError('service request listing lookup failed', listingError);
        return serviceReply({ error: 'Não foi possível validar o serviço.' }, 500, origin);
      }
      if (!listing || listing.category_id !== categoryId || Boolean(listing.is_demo) !== actorIsDemo) {
        return serviceReply({ error: 'O serviço informado não pertence ao mesmo ambiente da conta.' }, 409, origin);
      }
    }

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
      is_demo: actorIsDemo,
    }).select('id').single();
    if (error || !data) {
      logDatabaseError('service request insert failed', error);
      return serviceReply({ error: 'Não foi possível criar a solicitação.' }, 400, origin);
    }
    return serviceReply({ id: data.id }, 201, origin);
  }

  if (action === 'submit_proposal') {
    const requestId = uuid(body.requestId);
    const amountCents = integer(body.amountCents, -1);
    const deliveryDays = integer(body.deliveryDays);
    const revisions = integer(body.revisions);
    const scope = text(body.scope, 10000);
    const deliverables = strings(body.deliverables);
    if (!requestId || amountCents < 0 || deliveryDays <= 0 || revisions < 0 || scope.length < 20) {
      return serviceReply({ error: 'Valor, prazo e escopo completo são obrigatórios.' }, 400, origin);
    }

    const { data: capability, error: capabilityError } = await admin.from('account_capabilities')
      .select('capability')
      .eq('user_id', userId)
      .in('capability', ['producer', 'instructor'])
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (capabilityError) {
      logDatabaseError('service proposal capability lookup failed', capabilityError);
      return serviceReply({ error: 'Não foi possível validar as permissões da conta.' }, 500, origin);
    }
    if (!capability) {
      return serviceReply({ error: 'Ative o ambiente de produtor ou instrutor para enviar propostas.' }, 403, origin);
    }

    const { data: serviceRequest, error: requestError } = await admin.from('service_requests')
      .select('id,status,currency,is_demo')
      .eq('id', requestId)
      .maybeSingle();
    if (requestError) {
      logDatabaseError('service proposal request lookup failed', requestError);
      return serviceReply({ error: 'Não foi possível validar a solicitação.' }, 500, origin);
    }
    if (!serviceRequest || serviceRequest.status !== 'open') {
      return serviceReply({ error: 'Esta solicitação não aceita novas propostas.' }, 409, origin);
    }
    if (Boolean(serviceRequest.is_demo) !== actorIsDemo) {
      return serviceReply({ error: 'Solicitação indisponível para este ambiente.' }, 403, origin);
    }

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
    if (error || !data) {
      logDatabaseError('service proposal upsert failed', error);
      return serviceReply({ error: 'Não foi possível enviar a proposta.' }, 400, origin);
    }
    return serviceReply({ id: data.id }, 200, origin);
  }

  if (action === 'accept_proposal') {
    const requestId = uuid(body.requestId);
    const proposalId = uuid(body.proposalId);
    if (!requestId || !proposalId) {
      return serviceReply({ error: 'Solicitação ou proposta inválida.' }, 400, origin);
    }

    const { data: serviceRequest, error: requestError } = await admin.from('service_requests')
      .select('client_id,is_demo')
      .eq('id', requestId)
      .maybeSingle();
    if (requestError) {
      logDatabaseError('service proposal acceptance request lookup failed', requestError);
      return serviceReply({ error: 'Não foi possível validar a solicitação.' }, 500, origin);
    }
    if (!serviceRequest || serviceRequest.client_id !== userId || Boolean(serviceRequest.is_demo) !== actorIsDemo) {
      return serviceReply({ error: 'Apenas o cliente do mesmo ambiente pode escolher a proposta.' }, 403, origin);
    }

    const { data, error } = await admin.rpc('service_accept_service_proposal', {
      target_request_id: requestId,
      target_proposal_id: proposalId,
      target_buyer_id: userId,
    });
    if (error) {
      logDatabaseError('service proposal acceptance failed', error);
      return serviceReply({ error: 'Não foi possível aceitar a proposta.' }, 400, origin);
    }
    return serviceReply({ offerId: data }, 200, origin);
  }

  if (action === 'cancel_request') {
    const requestId = uuid(body.requestId);
    if (!requestId) return serviceReply({ error: 'Solicitação inválida.' }, 400, origin);

    const { error } = await admin.from('service_requests')
      .update({ status: 'canceled' })
      .eq('id', requestId)
      .eq('client_id', userId)
      .eq('status', 'open')
      .eq('is_demo', actorIsDemo);
    if (error) {
      logDatabaseError('service request cancel failed', error);
      return serviceReply({ error: 'Não foi possível cancelar a solicitação.' }, 400, origin);
    }
    return serviceReply({ success: true }, 200, origin);
  }

  if (action === 'withdraw_proposal') {
    const proposalId = uuid(body.proposalId);
    if (!proposalId) return serviceReply({ error: 'Proposta inválida.' }, 400, origin);

    const { data: proposal, error: proposalError } = await admin.from('service_proposals')
      .select('id,service_requests!inner(is_demo)')
      .eq('id', proposalId)
      .eq('provider_id', userId)
      .maybeSingle();
    if (proposalError) {
      logDatabaseError('service proposal withdrawal lookup failed', proposalError);
      return serviceReply({ error: 'Não foi possível validar a proposta.' }, 500, origin);
    }
    const relatedRequest = proposal?.service_requests as unknown as { is_demo?: boolean } | null;
    if (!proposal || Boolean(relatedRequest?.is_demo) !== actorIsDemo) {
      return serviceReply({ error: 'Proposta indisponível para este ambiente.' }, 403, origin);
    }

    const { error } = await admin.from('service_proposals')
      .update({ status: 'withdrawn' })
      .eq('id', proposalId)
      .eq('provider_id', userId)
      .eq('status', 'submitted');
    if (error) {
      logDatabaseError('service proposal withdrawal failed', error);
      return serviceReply({ error: 'Não foi possível retirar a proposta.' }, 400, origin);
    }
    return serviceReply({ success: true }, 200, origin);
  }

  return serviceReply({ error: 'Ação não suportada.' }, 400, origin);
});
