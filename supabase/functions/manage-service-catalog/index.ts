import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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

const reply = (body: unknown, status: number, origin: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
});

const origins = () => (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('DEV_ALLOWED_ORIGINS') ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean);
const resolveOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (origins().includes(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return origin;
  } catch { return null; }
  return null;
};
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const strings = (value: unknown, maxItems = 20) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, maxItems)
  : [];
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
  if (authorization) {
    const client = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data } = await client.auth.getUser();
    userId = data.user?.id ?? null;
  }
  const isDev = supabaseUrl.includes(DEV_REF);
  if (!userId && isDev && typeof body.actingUserId === 'string' && UUID_PATTERN.test(body.actingUserId)) {
    const { data } = await admin.from('user_profiles').select('user_id').eq('user_id', body.actingUserId).eq('is_demo', true).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) return reply({ error: 'Autenticação obrigatória.' }, 401, origin);

  const { data: capability } = await admin.from('account_capabilities').select('capability,status')
    .eq('user_id', userId).in('capability', ['producer', 'instructor']).eq('status', 'active').limit(1).maybeSingle();
  if (!capability) return reply({ error: 'Ative o ambiente de produtor ou instrutor para publicar serviços.' }, 403, origin);

  const action = text(body.action, 40);
  if (action === 'save_listing') {
    const title = text(body.title, 140);
    const description = text(body.description, 10000);
    const categoryId = typeof body.categoryId === 'string' && UUID_PATTERN.test(body.categoryId) ? body.categoryId : null;
    if (title.length < 3 || description.length < 20 || !categoryId) return reply({ error: 'Título, categoria e descrição completa são obrigatórios.' }, 400, origin);
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    if (listingId) {
      const { data: owned } = await admin.from('service_listings').select('id').eq('id', listingId).eq('provider_id', userId).maybeSingle();
      if (!owned) return reply({ error: 'Serviço não encontrado para esta conta.' }, 404, origin);
      const { data, error } = await admin.from('service_listings').update({
        category_id: categoryId, title, short_description: text(body.shortDescription, 280) || null,
        description, requirements: strings(body.requirements), moderation_status: 'pending', status: 'draft',
      }).eq('id', listingId).select('id').single();
      if (error) return reply({ error: error.message }, 400, origin);
      return reply({ id: data.id }, 200, origin);
    }
    const slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await admin.from('service_listings').insert({
      provider_id: userId, category_id: categoryId, slug, title,
      short_description: text(body.shortDescription, 280) || null, description,
      requirements: strings(body.requirements), status: 'draft', moderation_status: 'pending', is_demo: isDev && !authorization,
    }).select('id').single();
    if (error || !data) return reply({ error: error?.message ?? 'Serviço não criado.' }, 400, origin);
    const { data: profile } = await admin.from('user_profiles').select('full_name,bio,avatar_url,city,is_demo').eq('user_id', userId).maybeSingle();
    await admin.from('service_provider_profiles').upsert({
      user_id: userId, display_name: profile?.full_name ?? 'Prestador musical', headline: 'Profissional da música',
      bio: profile?.bio ?? null, avatar_url: profile?.avatar_url ?? null, location: profile?.city ?? null,
      verified: Boolean(profile?.is_demo), active: true, is_demo: Boolean(profile?.is_demo),
    }, { onConflict: 'user_id' });
    return reply({ id: data.id }, 201, origin);
  }

  if (action === 'submit_listing') {
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    if (!listingId) return reply({ error: 'Serviço inválido.' }, 400, origin);
    const { data: listing } = await admin.from('service_listings').select('id,service_packages(id)').eq('id', listingId).eq('provider_id', userId).maybeSingle();
    if (!listing || !(listing.service_packages as unknown[] | null)?.length) return reply({ error: 'Cadastre ao menos um pacote antes de enviar para aprovação.' }, 409, origin);
    const { error } = await admin.from('service_listings').update({ status: 'draft', moderation_status: 'pending' }).eq('id', listingId).eq('provider_id', userId);
    if (error) return reply({ error: error.message }, 400, origin);
    return reply({ success: true }, 200, origin);
  }

  if (action === 'save_package') {
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    const packageId = typeof body.packageId === 'string' && UUID_PATTERN.test(body.packageId) ? body.packageId : null;
    const name = text(body.packageName, 100);
    const priceCents = typeof body.priceCents === 'number' ? Math.round(body.priceCents) : -1;
    const deliveryDays = typeof body.deliveryDays === 'number' ? Math.round(body.deliveryDays) : 0;
    const revisions = typeof body.revisions === 'number' ? Math.round(body.revisions) : 0;
    if (!listingId || name.length < 2 || priceCents < 0 || deliveryDays <= 0 || revisions < 0) return reply({ error: 'Dados do pacote inválidos.' }, 400, origin);
    const { data: owned } = await admin.from('service_listings').select('id').eq('id', listingId).eq('provider_id', userId).maybeSingle();
    if (!owned) return reply({ error: 'Serviço não encontrado para esta conta.' }, 404, origin);
    const payload = {
      listing_id: listingId, name, description: text(body.packageDescription, 1000) || null,
      price_cents: priceCents, currency: text(body.currency, 3).toUpperCase() || 'BRL',
      delivery_days: deliveryDays, revisions, deliverables: strings(body.deliverables), active: body.active !== false,
    };
    if (packageId) {
      const { data, error } = await admin.from('service_packages').update(payload).eq('id', packageId).eq('listing_id', listingId).select('id').single();
      if (error) return reply({ error: error.message }, 400, origin);
      return reply({ id: data.id }, 200, origin);
    }
    const { data, error } = await admin.from('service_packages').insert({ ...payload, code: `PACOTE-${crypto.randomUUID().slice(0, 8).toUpperCase()}` }).select('id').single();
    if (error || !data) return reply({ error: error?.message ?? 'Pacote não criado.' }, 400, origin);
    return reply({ id: data.id }, 201, origin);
  }

  if (action === 'archive_listing') {
    const listingId = typeof body.listingId === 'string' && UUID_PATTERN.test(body.listingId) ? body.listingId : null;
    const { error } = await admin.from('service_listings').update({ status: 'archived' }).eq('id', listingId).eq('provider_id', userId);
    if (error) return reply({ error: error.message }, 400, origin);
    return reply({ success: true }, 200, origin);
  }

  return reply({ error: 'Ação não suportada.' }, 400, origin);
});
