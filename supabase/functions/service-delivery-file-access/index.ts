import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  readServiceJsonObject,
  resolveServiceOrigin,
  serviceOptions,
  serviceReply,
} from '../_shared/serviceEndpoint.ts';

const DEV_REF = 'ywirfqvobfnunlcsnptm';
const BUCKET = 'service-deliveries';
const MAX_FILE_SIZE = 1_073_741_824;
const MAX_PATH_LENGTH = 1_024;
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

const safeFileName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^[-.]+|[-.]+$/g, '')
  .slice(0, 160) || 'entrega';
const logDatabaseError = (event: string, error: { code?: string; details?: string; hint?: string } | null) => {
  if (error) console.error(event, { code: error.code, details: error.details, hint: error.hint });
};
const parseStoragePath = (value: unknown) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PATH_LENGTH) return null;
  if (value.startsWith('/') || value.endsWith('/') || value.includes('\\')) return null;
  const segments = value.split('/');
  if (segments.length < 3 || segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  const [contractId, milestoneId] = segments;
  if (!UUID_PATTERN.test(contractId) || !UUID_PATTERN.test(milestoneId)) return null;
  return { path: value, contractId, milestoneId };
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
  const body = parsedBody as AccessBody;
  const action = body.action === 'create_upload' || body.action === 'create_download' ? body.action : null;
  if (!action) return serviceReply({ error: 'Ação inválida.' }, 400, origin);

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
      .select('user_id')
      .eq('user_id', body.actingUserId)
      .eq('is_demo', true)
      .maybeSingle();
    userId = profile?.user_id ?? null;
  }
  if (!userId) return serviceReply({ error: 'Autenticação obrigatória.' }, 401, origin);

  const { data: actorProfile, error: actorError } = await admin.from('user_profiles')
    .select('is_demo')
    .eq('user_id', userId)
    .maybeSingle();
  if (actorError || !actorProfile) {
    logDatabaseError('service delivery actor lookup failed', actorError);
    return serviceReply({ error: 'Não foi possível validar a conta.' }, 500, origin);
  }
  const actorIsDemo = Boolean(actorProfile.is_demo);

  if (action === 'create_upload') {
    const contractId = typeof body.contractId === 'string' && UUID_PATTERN.test(body.contractId) ? body.contractId : null;
    const milestoneId = typeof body.milestoneId === 'string' && UUID_PATTERN.test(body.milestoneId) ? body.milestoneId : null;
    const fileName = typeof body.fileName === 'string' ? safeFileName(body.fileName) : null;
    const contentType = typeof body.contentType === 'string' ? body.contentType.toLowerCase() : 'application/octet-stream';
    const sizeBytes = typeof body.sizeBytes === 'number' && Number.isSafeInteger(body.sizeBytes) ? body.sizeBytes : -1;
    if (!contractId || !milestoneId || !fileName || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(contentType)) {
      return serviceReply({ error: 'Arquivo ou contrato inválido.' }, 400, origin);
    }

    const { data: milestone, error: milestoneError } = await admin.from('service_milestones')
      .select('id,contract_id,service_contracts!inner(provider_id,status,is_demo)')
      .eq('id', milestoneId)
      .eq('contract_id', contractId)
      .maybeSingle();
    if (milestoneError) {
      logDatabaseError('service delivery milestone lookup failed', milestoneError);
      return serviceReply({ error: 'Não foi possível validar o contrato.' }, 500, origin);
    }
    const relation = milestone?.service_contracts as unknown as { provider_id?: string; status?: string; is_demo?: boolean } | null;
    if (
      !milestone
      || relation?.provider_id !== userId
      || Boolean(relation?.is_demo) !== actorIsDemo
      || ['completed', 'canceled', 'refunded'].includes(relation.status ?? '')
    ) {
      return serviceReply({ error: 'Usuário não pode enviar arquivos para este contrato.' }, 403, origin);
    }

    const path = `${contractId}/${milestoneId}/${crypto.randomUUID()}-${fileName}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) {
      logDatabaseError('service delivery upload signing failed', error);
      return serviceReply({ error: 'Não foi possível autorizar o upload.' }, 400, origin);
    }
    return serviceReply({ path, token: data.token }, 200, origin);
  }

  const parsedPath = parseStoragePath(body.path);
  if (!parsedPath) return serviceReply({ error: 'Caminho inválido.' }, 400, origin);

  const { data: contract, error: contractError } = await admin.from('service_contracts')
    .select('buyer_id,provider_id,is_demo')
    .eq('id', parsedPath.contractId)
    .maybeSingle();
  if (contractError) {
    logDatabaseError('service delivery contract lookup failed', contractError);
    return serviceReply({ error: 'Não foi possível validar o contrato.' }, 500, origin);
  }
  if (
    !contract
    || ![contract.buyer_id, contract.provider_id].includes(userId)
    || Boolean(contract.is_demo) !== actorIsDemo
  ) {
    return serviceReply({ error: 'Usuário não participa deste contrato.' }, 403, origin);
  }

  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(parsedPath.path, 600);
  if (error || !data?.signedUrl) {
    logDatabaseError('service delivery download signing failed', error);
    return serviceReply({ error: 'Arquivo indisponível.' }, 400, origin);
  }
  return serviceReply({ signedUrl: data.signedUrl, expiresIn: 600 }, 200, origin);
});
