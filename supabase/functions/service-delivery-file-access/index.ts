import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const DEV_REF = 'ywirfqvobfnunlcsnptm';
const BUCKET = 'service-deliveries';
const MAX_FILE_SIZE = 1_073_741_824;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac',
  'video/mp4', 'video/webm', 'application/pdf', 'application/zip',
  'application/x-zip-compressed', 'application/octet-stream',
  'image/jpeg', 'image/png', 'image/webp',
]);

interface AccessBody {
  action?: unknown;
  contractId?: unknown;
  milestoneId?: unknown;
  path?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  actingUserId?: unknown;
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

const configuredOrigins = () => (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('DEV_ALLOWED_ORIGINS') ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean);

const resolveOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (configuredOrigins().includes(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)) return origin;
  } catch {
    return null;
  }
  return null;
};

const safeFileName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 160) || 'entrega';

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

  const body = await request.json().catch(() => ({})) as AccessBody;
  const action = body.action === 'create_upload' || body.action === 'create_download' ? body.action : null;
  if (!action) return reply({ error: 'Ação inválida.' }, 400, origin);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = request.headers.get('authorization');
  let userId: string | null = null;
  if (authorization) {
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data } = await userClient.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const isDevProject = supabaseUrl.includes(DEV_REF);
  if (!userId && isDevProject && typeof body.actingUserId === 'string' && UUID_PATTERN.test(body.actingUserId)) {
    const { data: profile } = await admin.from('user_profiles')
      .select('user_id').eq('user_id', body.actingUserId).eq('is_demo', true).maybeSingle();
    userId = profile?.user_id ?? null;
  }
  if (!userId) return reply({ error: 'Autenticação obrigatória.' }, 401, origin);

  const { data: actorProfile } = await admin.from('user_profiles').select('is_demo').eq('user_id', userId).maybeSingle();
  const actorIsDemo = Boolean(actorProfile?.is_demo);

  if (action === 'create_upload') {
    const contractId = typeof body.contractId === 'string' && UUID_PATTERN.test(body.contractId) ? body.contractId : null;
    const milestoneId = typeof body.milestoneId === 'string' && UUID_PATTERN.test(body.milestoneId) ? body.milestoneId : null;
    const fileName = typeof body.fileName === 'string' ? safeFileName(body.fileName) : null;
    const contentType = typeof body.contentType === 'string' ? body.contentType : 'application/octet-stream';
    const sizeBytes = typeof body.sizeBytes === 'number' && Number.isFinite(body.sizeBytes) ? body.sizeBytes : -1;
    if (!contractId || !milestoneId || !fileName || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(contentType)) {
      return reply({ error: 'Arquivo ou contrato inválido.' }, 400, origin);
    }

    const { data: milestone } = await admin.from('service_milestones')
      .select('id,contract_id,service_contracts!inner(provider_id,status,is_demo)')
      .eq('id', milestoneId).eq('contract_id', contractId).maybeSingle();
    const relation = milestone?.service_contracts as unknown as { provider_id?: string; status?: string; is_demo?: boolean } | null;
    if (
      !milestone
      || relation?.provider_id !== userId
      || Boolean(relation?.is_demo) !== actorIsDemo
      || ['completed', 'canceled', 'refunded'].includes(relation.status ?? '')
    ) {
      return reply({ error: 'Usuário não pode enviar arquivos para este contrato.' }, 403, origin);
    }

    const path = `${contractId}/${milestoneId}/${crypto.randomUUID()}-${fileName}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) return reply({ error: error?.message ?? 'Não foi possível autorizar o upload.' }, 400, origin);
    return reply({ path, token: data.token }, 200, origin);
  }

  const path = typeof body.path === 'string' ? body.path : '';
  const [contractId, milestoneId] = path.split('/');
  if (!UUID_PATTERN.test(contractId ?? '') || !UUID_PATTERN.test(milestoneId ?? '')) {
    return reply({ error: 'Caminho inválido.' }, 400, origin);
  }
  const { data: contract } = await admin.from('service_contracts')
    .select('buyer_id,provider_id,is_demo').eq('id', contractId).maybeSingle();
  if (
    !contract
    || ![contract.buyer_id, contract.provider_id].includes(userId)
    || Boolean(contract.is_demo) !== actorIsDemo
  ) {
    return reply({ error: 'Usuário não participa deste contrato.' }, 403, origin);
  }
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) return reply({ error: error?.message ?? 'Arquivo indisponível.' }, 400, origin);
  return reply({ signedUrl: data.signedUrl, expiresIn: 600 }, 200, origin);
});
