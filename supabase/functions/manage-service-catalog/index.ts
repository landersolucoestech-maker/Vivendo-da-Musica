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
  listingId?: unknown;
  categoryId?: unknown;
  title?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  requirements?: unknown;
  packageId?: unknown;
  packageName?: unknown;
  packageDescription?: unknown;
  priceCents?: unknown;
  currency?: unknown;
  deliveryDays?: unknown;
  revisions?: unknown;
  deliverables?: unknown;
  active?: unknown;
}

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const strings = (value: unknown, maxItems = 20) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, maxItems)
  : [];
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

  const isDev = supabaseUrl.includes(DEV_REF);
  if (!userId && isDev && typeof body.actingUserId === 'string' && UUID_PATTERN.test(body.actingUserId)) {
    const { data } = await admin.from('user_profiles')
      .select('user_id')
      .eq('user_id', body.actingUserId)
      .eq('is_demo', true)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return serviceReply({ error: 'Autenticação obrigatória.' }, 401, origin);

  const { data: actorProfile, error: actorError } = await admin.from('user_profiles')
    .select('full_name,avatar_url,is_demo')
    .eq('user_id', userId)
    .maybeSingle();
  if (actorError || !actorProfile) {
    logDatabaseError('service catalog actor lookup failed', actorError);
    return serviceReply({ error: 'Não foi possível validar a conta.' }, 500, origin);
  }
  const actorIsDemo = Boolean(actorProfile.is_demo);

  const { data: capability, error: capabilityError } = await admin.from('account_capabilities')
    .select('capability,status')
    .eq('user_id', userId)
    .in('capability', ['producer', 'instructor'])
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (capabilityError) {
    logDatabaseError('service catalog capability lookup failed', capabilityError);
    return serviceReply({ error: 'Não foi possível validar as permissões da conta.' }, 500, origin);
  }
  if (!capability) {
    return serviceReply({ error: 'Ative o ambiente de produtor ou instrutor para publicar serviços.' }, 403, origin);
  }

  const action = text(body.action, 40);
  if (action === 'save_listing') {
    const title = text(body.title, 140);
    const description = text(body.description, 10000);
    const categoryId = typeof body.categoryId === 'string' && UUID_PATTERN.test(body.categoryId) ? body.categoryId : null;
    if (title.length < 3 || description.length < 20 || !categoryId) {
      return serviceReply({ error: 'Título, categoria e descrição completa são obrigatórios.' }, 400, origin);
    }

    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    if (listingId) {
      const { data: owned, error: ownedError } = await admin.from('service_listings')
        .select('id')
        .eq('id', listingId)
        .eq('provider_id', userId)
        .eq('is_demo', actorIsDemo)
        .maybeSingle();
      if (ownedError) {
        logDatabaseError('service listing ownership lookup failed', ownedError);
        return serviceReply({ error: 'Não foi possível validar o serviço.' }, 500, origin);
      }
      if (!owned) return serviceReply({ error: 'Serviço não encontrado para esta conta.' }, 404, origin);

      const { data, error } = await admin.from('service_listings').update({
        category_id: categoryId,
        title,
        short_description: text(body.shortDescription, 280) || null,
        description,
        requirements: strings(body.requirements),
        moderation_status: 'pending',
        status: 'draft',
        is_demo: actorIsDemo,
      }).eq('id', listingId).select('id').single();
      if (error || !data) {
        logDatabaseError('service listing update failed', error);
        return serviceReply({ error: 'Não foi possível salvar o serviço.' }, 400, origin);
      }
      return serviceReply({ id: data.id }, 200, origin);
    }

    const slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await admin.from('service_listings').insert({
      provider_id: userId,
      category_id: categoryId,
      slug,
      title,
      short_description: text(body.shortDescription, 280) || null,
      description,
      requirements: strings(body.requirements),
      status: 'draft',
      moderation_status: 'pending',
      is_demo: actorIsDemo,
    }).select('id').single();
    if (error || !data) {
      logDatabaseError('service listing insert failed', error);
      return serviceReply({ error: 'Não foi possível criar o serviço.' }, 400, origin);
    }

    const { error: profileError } = await admin.from('service_provider_profiles').upsert({
      user_id: userId,
      display_name: actorProfile.full_name ?? 'Prestador musical',
      headline: 'Profissional da música',
      bio: null,
      avatar_url: actorProfile.avatar_url ?? null,
      location: null,
      verified: actorIsDemo,
      active: true,
      is_demo: actorIsDemo,
    }, { onConflict: 'user_id' });
    if (profileError) logDatabaseError('service provider profile upsert failed', profileError);
    return serviceReply({ id: data.id }, 201, origin);
  }

  if (action === 'submit_listing') {
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    if (!listingId) return serviceReply({ error: 'Serviço inválido.' }, 400, origin);

    const { data: listing, error: listingError } = await admin.from('service_listings')
      .select('id,service_packages(id)')
      .eq('id', listingId)
      .eq('provider_id', userId)
      .eq('is_demo', actorIsDemo)
      .maybeSingle();
    if (listingError) {
      logDatabaseError('service listing submission lookup failed', listingError);
      return serviceReply({ error: 'Não foi possível validar o serviço.' }, 500, origin);
    }
    if (!listing || !(listing.service_packages as unknown[] | null)?.length) {
      return serviceReply({ error: 'Cadastre ao menos um pacote antes de enviar para aprovação.' }, 409, origin);
    }

    const { error } = await admin.from('service_listings')
      .update({ status: 'draft', moderation_status: 'pending' })
      .eq('id', listingId)
      .eq('provider_id', userId)
      .eq('is_demo', actorIsDemo);
    if (error) {
      logDatabaseError('service listing submission failed', error);
      return serviceReply({ error: 'Não foi possível enviar o serviço para aprovação.' }, 400, origin);
    }
    return serviceReply({ success: true }, 200, origin);
  }

  if (action === 'save_package') {
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    const packageId = typeof body.packageId === 'string' && UUID_PATTERN.test(body.packageId) ? body.packageId : null;
    const name = text(body.packageName, 100);
    const priceCents = typeof body.priceCents === 'number' && Number.isSafeInteger(body.priceCents) ? body.priceCents : -1;
    const deliveryDays = typeof body.deliveryDays === 'number' && Number.isSafeInteger(body.deliveryDays) ? body.deliveryDays : 0;
    const revisions = typeof body.revisions === 'number' && Number.isSafeInteger(body.revisions) ? body.revisions : 0;
    const rawCurrency = text(body.currency, 3).toUpperCase() || 'BRL';
    const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : '';
    if (!listingId || name.length < 2 || priceCents < 0 || deliveryDays <= 0 || revisions < 0 || !currency) {
      return serviceReply({ error: 'Dados do pacote inválidos.' }, 400, origin);
    }

    const { data: owned, error: ownedError } = await admin.from('service_listings')
      .select('id')
      .eq('id', listingId)
      .eq('provider_id', userId)
      .eq('is_demo', actorIsDemo)
      .maybeSingle();
    if (ownedError) {
      logDatabaseError('service package ownership lookup failed', ownedError);
      return serviceReply({ error: 'Não foi possível validar o serviço.' }, 500, origin);
    }
    if (!owned) return serviceReply({ error: 'Serviço não encontrado para esta conta.' }, 404, origin);

    const payload = {
      listing_id: listingId,
      name,
      description: text(body.packageDescription, 1000) || null,
      price_cents: priceCents,
      currency,
      delivery_days: deliveryDays,
      revisions,
      deliverables: strings(body.deliverables),
      active: body.active !== false,
    };
    if (packageId) {
      const { data, error } = await admin.from('service_packages')
        .update(payload)
        .eq('id', packageId)
        .eq('listing_id', listingId)
        .select('id')
        .single();
      if (error || !data) {
        logDatabaseError('service package update failed', error);
        return serviceReply({ error: 'Não foi possível salvar o pacote.' }, 400, origin);
      }
      return serviceReply({ id: data.id }, 200, origin);
    }

    const { data, error } = await admin.from('service_packages').insert({
      ...payload,
      code: `PACOTE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    }).select('id').single();
    if (error || !data) {
      logDatabaseError('service package insert failed', error);
      return serviceReply({ error: 'Não foi possível criar o pacote.' }, 400, origin);
    }
    return serviceReply({ id: data.id }, 201, origin);
  }

  if (action === 'archive_listing') {
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    if (!listingId) return serviceReply({ error: 'Serviço inválido.' }, 400, origin);

    const { error } = await admin.from('service_listings')
      .update({ status: 'archived' })
      .eq('id', listingId)
      .eq('provider_id', userId)
      .eq('is_demo', actorIsDemo);
    if (error) {
      logDatabaseError('service listing archive failed', error);
      return serviceReply({ error: 'Não foi possível arquivar o serviço.' }, 400, origin);
    }
    return serviceReply({ success: true }, 200, origin);
  }

  return serviceReply({ error: 'Ação não suportada.' }, 400, origin);
});
