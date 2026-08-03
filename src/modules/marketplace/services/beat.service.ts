import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import type { Beat, BeatLicense, ProducerBeatDashboard } from '@/modules/marketplace/types/product';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export interface CreateBeatInput {
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  mood: string;
  description?: string;
  previewFile: File;
  masterFile: File;
  stemsFile?: File;
}

export interface UpdateBeatInput {
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  mood: string;
}

export interface UpdateLicenseInput {
  name: string;
  priceCents: number;
  maxCopies?: number;
  usageRights: string[];
  deliverables: string[];
  available: boolean;
}

interface BeatLicenseTemplateRow {
  license_type: BeatLicense['type'];
  name: string;
  price_cents: number;
  currency: string;
  deliverables: unknown;
  usage_rights: unknown;
  max_copies: number | null;
  is_exclusive: boolean;
}

const gradients = [['#8A2BE2', '#6C3AED'], ['#6C3AED', '#24103f'], ['#8A2BE2', '#1A1A1A']] as const;
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const safeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');

const currentProducerId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return getEffectiveUserId(user?.id ?? null);
};

const parseRpcError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  return new Error(payload?.message ?? fallback);
};

const loadActiveLicenseTemplates = async (): Promise<BeatLicenseTemplateRow[]> => {
  const response = await fetch(
    `${env.supabaseUrl}/rest/v1/beat_license_templates?select=license_type,name,price_cents,currency,deliverables,usage_rights,max_copies,is_exclusive&active=eq.true&order=sort_order.asc`,
    {
      headers: {
        apikey: env.supabasePublishableKey,
        Authorization: `Bearer ${env.supabasePublishableKey}`,
      },
    },
  );

  if (!response.ok) {
    throw await parseRpcError(response, 'Não foi possível carregar os modelos de licença configurados.');
  }

  const templates = await response.json() as BeatLicenseTemplateRow[];
  if (!templates.length) {
    throw new Error('Nenhum modelo de licença ativo foi configurado pelo administrador.');
  }
  return templates;
};

const mapLicense = (row: Record<string, unknown>): BeatLicense => ({
  id: String(row.id),
  type: row.license_type as BeatLicense['type'],
  name: String(row.name),
  priceCents: Number(row.price_cents),
  currency: String(row.currency),
  deliverables: stringArray(row.deliverables),
  usageRights: stringArray(row.usage_rights),
  ...(row.max_copies === null || row.max_copies === undefined ? {} : { maxCopies: Number(row.max_copies) }),
  isExclusive: Boolean(row.is_exclusive),
  available: Boolean(row.available),
});

const mapBeat = (row: Record<string, unknown>, index: number, producerName = 'Produtor independente'): Beat => {
  const events = (row.beat_events ?? []) as Array<{ event_type: string }>;
  const orders = (row.beat_order_items ?? []) as Array<{ amount_cents: number; status?: string }>;
  const views = events.filter((event) => event.event_type === 'view').length;
  const plays = events.filter((event) => event.event_type === 'play').length;
  const paidOrders = orders.filter((order) => !order.status || order.status === 'paid');
  const sales = paidOrders.length;
  const revenueCents = paidOrders.reduce((total, order) => total + Number(order.amount_cents), 0);
  const [gradientFrom, gradientTo] = gradients[index % gradients.length];
  const previewPath = row.preview_file_path ? String(row.preview_file_path) : null;
  const audioPreviewUrl = previewPath && /^https?:\/\//i.test(previewPath)
    ? previewPath
    : previewPath ? supabase.storage.from('beat-previews').getPublicUrl(previewPath).data.publicUrl : null;

  return {
    id: String(row.id), slug: String(row.slug), title: String(row.title), producerId: String(row.producer_id), producerName,
    genre: String(row.genre), bpm: Number(row.bpm ?? 0), key: String(row.musical_key ?? 'N/A'), mood: String(row.mood ?? 'Não informado'),
    durationSeconds: Number(row.duration_seconds ?? 0), coverUrl: row.cover_url ? String(row.cover_url) : null, audioPreviewUrl,
    gradientFrom, gradientTo, views, plays, sales, revenueCents,
    conversionRate: views ? Number(((sales / views) * 100).toFixed(1)) : 0,
    exclusiveAvailable: Boolean(row.exclusive_available), copyrightStatus: row.copyright_status as Beat['copyrightStatus'],
    status: row.status as Beat['status'], ...(row.copyright_evidence_id ? { copyrightEvidenceId: String(row.copyright_evidence_id) } : {}),
    publishedAt: row.published_at ? String(row.published_at) : '',
    licenses: ((row.beat_licenses ?? []) as Record<string, unknown>[]).map(mapLicense).sort((a, b) => a.priceCents - b.priceCents),
  };
};

const beatSelect = 'id,slug,title,producer_id,genre,bpm,musical_key,mood,duration_seconds,cover_url,preview_file_path,copyright_status,copyright_evidence_id,status,exclusive_available,published_at,beat_licenses(id,license_type,name,price_cents,currency,deliverables,usage_rights,max_copies,is_exclusive,available),beat_events(event_type),beat_order_items(amount_cents,status)';

export const beatService = {
  async listBeats(): Promise<Beat[]> {
    const { data, error } = await supabase.from('beats').select(beatSelect).eq('status', 'published').order('published_at', { ascending: false });
    if (error) throw error;
    const producerIds = [...new Set((data ?? []).map((row) => row.producer_id))];
    const { data: profiles } = producerIds.length ? await supabase.from('user_profiles').select('user_id,full_name').in('user_id', producerIds) : { data: [] };
    const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? 'Produtor']));
    return (data ?? []).map((row, index) => mapBeat(row as Record<string, unknown>, index, names.get(row.producer_id)));
  },

  async getBeatBySlug(slug: string): Promise<Beat | undefined> {
    return (await this.listBeats()).find((beat) => beat.slug === slug);
  },

  async getBeatDetailBundle(slug: string) {
    const beat = await this.getBeatBySlug(slug);
    return beat ? { beat, related: (await this.listBeats()).filter((item) => item.id !== beat.id).slice(0, 4) } : undefined;
  },

  async createBeat(input: CreateBeatInput): Promise<void> {
    const producerId = await currentProducerId();
    const templates = await loadActiveLicenseTemplates();
    const slug = `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data, error } = await supabase.from('beats').insert({
      producer_id: producerId, slug, title: input.title.trim(), description: input.description?.trim() || null, genre: input.genre.trim(),
      bpm: Math.round(input.bpm), musical_key: input.musicalKey.trim(), mood: input.mood.trim(), copyright_status: 'pending',
      status: 'draft', exclusive_available: true, is_demo: isDevAuthBypassEnabled,
    }).select('id').single();
    if (error || !data) throw new Error(error?.message ?? 'Não foi possível criar o beat.');

    const basePath = `${producerId}/${data.id}`;
    const uploaded: Array<{ bucket: string; path: string }> = [];
    try {
      const previewPath = `${basePath}/preview-${safeName(input.previewFile.name)}`;
      const masterPath = `${basePath}/master-${safeName(input.masterFile.name)}`;
      for (const [bucket, path, file] of [['beat-previews', previewPath, input.previewFile], ['beat-masters', masterPath, input.masterFile]] as const) {
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push({ bucket, path });
      }
      let stemsPath: string | null = null;
      if (input.stemsFile) {
        stemsPath = `${basePath}/stems-${safeName(input.stemsFile.name)}`;
        const { error: stemsError } = await supabase.storage.from('beat-stems').upload(stemsPath, input.stemsFile, { upsert: false });
        if (stemsError) throw stemsError;
        uploaded.push({ bucket: 'beat-stems', path: stemsPath });
      }
      const copyrightFields = isDevAuthBypassEnabled
        ? { copyright_status: 'registered', copyright_evidence_id: `DEV-${data.id}` }
        : {};
      const { error: updateError } = await supabase.from('beats').update({
        preview_file_path: previewPath,
        master_file_path: masterPath,
        stems_file_path: stemsPath,
        ...copyrightFields,
      }).eq('id', data.id).eq('producer_id', producerId);
      if (updateError) throw updateError;

      const licenses = templates.map((template) => ({
        beat_id: data.id,
        license_type: template.license_type,
        name: template.name,
        price_cents: template.price_cents,
        currency: template.currency,
        deliverables: stringArray(template.deliverables),
        usage_rights: stringArray(template.usage_rights),
        max_copies: template.max_copies,
        is_exclusive: template.is_exclusive,
        available: true,
      }));
      const { error: licenseError } = await supabase.from('beat_licenses').insert(licenses);
      if (licenseError) throw licenseError;
    } catch (failure) {
      for (const item of uploaded) await supabase.storage.from(item.bucket).remove([item.path]);
      await supabase.from('beats').delete().eq('id', data.id).eq('producer_id', producerId);
      throw failure;
    }
  },

  async updateBeat(id: string, input: UpdateBeatInput): Promise<void> {
    const producerId = await currentProducerId();
    const { error } = await supabase.from('beats').update({ title: input.title.trim(), genre: input.genre.trim(), bpm: Math.round(input.bpm), musical_key: input.musicalKey.trim(), mood: input.mood.trim(), updated_at: new Date().toISOString() }).eq('id', id).eq('producer_id', producerId);
    if (error) throw error;
  },

  async setBeatStatus(id: string, status: Beat['status']): Promise<void> {
    const producerId = await currentProducerId();
    const { data: beat, error: readError } = await supabase
      .from('beats')
      .select('published_at')
      .eq('id', id)
      .eq('producer_id', producerId)
      .maybeSingle();
    if (readError) throw readError;
    if (!beat) throw new Error('Beat não encontrado para este produtor.');

    const publishedAt = beat.published_at
      ?? (status === 'published' ? new Date().toISOString() : null);
    const { error } = await supabase.from('beats').update({ status, published_at: publishedAt, updated_at: new Date().toISOString() }).eq('id', id).eq('producer_id', producerId);
    if (error) throw error;
  },

  async updateBeatLicense(beatId: string, licenseId: string, input: UpdateLicenseInput): Promise<void> {
    const producerId = await currentProducerId();
    const { data: beat, error: beatError } = await supabase.from('beats').select('id').eq('id', beatId).eq('producer_id', producerId).maybeSingle();
    if (beatError || !beat) throw new Error('Beat não encontrado para este produtor.');
    const { error } = await supabase.from('beat_licenses').update({ name: input.name.trim(), price_cents: Math.max(0, Math.round(input.priceCents)), max_copies: input.maxCopies ?? null, usage_rights: input.usageRights, deliverables: input.deliverables, available: input.available, updated_at: new Date().toISOString() }).eq('id', licenseId).eq('beat_id', beatId);
    if (error) throw error;
  },

  async getProducerDashboard(): Promise<ProducerBeatDashboard> {
    const producerId = await currentProducerId();
    const [beatsResult, ordersResult, accountResult, settingsResult, methodsResult, payoutsResult, profileResult] = await Promise.all([
      supabase.from('beats').select(beatSelect).eq('producer_id', producerId).order('created_at', { ascending: false }),
      supabase.from('beat_order_items').select('id,beat_title_snapshot,buyer_name_snapshot,license_name_snapshot,amount_cents,currency,status,paid_at').eq('producer_id', producerId).order('created_at', { ascending: false }),
      supabase.from('producer_financial_accounts').select('currency,current_balance_cents,eligible_balance_cents,next_eligibility_at').eq('producer_id', producerId).maybeSingle(),
      supabase.from('platform_financial_settings').select('default_commission_bps,payout_minimum_cents,payout_delay_days').eq('id', true).maybeSingle(),
      supabase.from('producer_payout_methods').select('id,method_type,display_label,is_default').eq('producer_id', producerId).eq('verified', true),
      supabase.from('producer_payout_requests').select('id,amount_cents,status,requested_at').eq('producer_id', producerId).order('requested_at', { ascending: false }),
      supabase.from('user_profiles').select('full_name').eq('user_id', producerId).maybeSingle(),
    ]);
    const failure = [beatsResult.error, ordersResult.error, accountResult.error, settingsResult.error, methodsResult.error, payoutsResult.error, profileResult.error].find(Boolean);
    if (failure) throw failure;
    const producerName = profileResult.data?.full_name
      ?? (isDevAuthBypassEnabled ? 'Produtor de Desenvolvimento' : 'Produtor');
    const beats = (beatsResult.data ?? []).map((row, index) => mapBeat(row as Record<string, unknown>, index, producerName));
    const paidOrders = (ordersResult.data ?? []).filter((order) => order.status === 'paid');
    const totalRevenueCents = paidOrders.reduce((total, order) => total + order.amount_cents, 0);
    const totalViews = beats.reduce((total, beat) => total + beat.views, 0);
    const totalPlays = beats.reduce((total, beat) => total + beat.plays, 0);
    const settings = settingsResult.data;
    const account = accountResult.data;
    return {
      financial: {
        availableBalanceCents: Number(account?.current_balance_cents ?? 0), eligibleBalanceCents: Number(account?.eligible_balance_cents ?? 0),
        nextEligibilityAt: account?.next_eligibility_at ?? null, currency: account?.currency ?? 'BRL', commissionBps: settings?.default_commission_bps ?? 0,
        payoutMinimumCents: settings?.payout_minimum_cents ?? 0, payoutDelayDays: settings?.payout_delay_days ?? 0,
        payoutMethods: (methodsResult.data ?? []).map((method) => ({ id: method.id, type: method.method_type, label: method.display_label, isDefault: method.is_default })),
        payoutRequests: (payoutsResult.data ?? []).map((request) => ({ id: request.id, amountCents: Number(request.amount_cents), status: request.status, requestedAt: request.requested_at })),
      },
      totals: { totalSales: paidOrders.length, totalRevenueCents, totalViews, totalPlays, averageConversionRate: totalViews ? Number(((paidOrders.length / totalViews) * 100).toFixed(1)) : 0 },
      ranking: [...beats].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
      transactions: paidOrders.map((order) => ({ id: order.id, beatTitle: order.beat_title_snapshot, buyerName: order.buyer_name_snapshot, licenseName: order.license_name_snapshot, amountCents: order.amount_cents, currency: order.currency, status: order.status as 'paid' | 'refunded' | 'disputed', paidAt: order.paid_at ?? '' })),
      beats,
    };
  },

  async requestProducerPayout(methodId: string, amountCents: number, currency: string): Promise<void> {
    const rpcName = isDevAuthBypassEnabled ? 'request_demo_producer_payout' : 'request_producer_payout';
    let authorization = `Bearer ${env.supabasePublishableKey}`;

    if (!isDevAuthBypassEnabled) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.access_token) throw new Error('Sessão do produtor não encontrada.');
      authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        apikey: env.supabasePublishableKey,
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_method_id: methodId,
        requested_amount_cents: amountCents,
        requested_currency: currency,
      }),
    });

    if (!response.ok) throw await parseRpcError(response, 'Não foi possível solicitar o repasse.');
  },
};
