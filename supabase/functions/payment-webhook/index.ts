import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const MAX_WEBHOOK_BYTES = 1_048_576;

interface StripeEvent {
  id: string;
  type: string;
  created?: number;
  data?: { object?: Record<string, unknown> };
}

class PayloadTooLargeError extends Error {}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  },
});

const bytesToHex = (bytes: Uint8Array) => [...bytes]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
};

const hmacSha256 = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(signature));
};

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const verifyStripeSignature = async (payload: string, signatureHeader: string, secret: string) => {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) ?? '';
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || !signatures.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > 300) return false;
  const expected = await hmacSha256(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => constantTimeEqual(signature, expected));
};

const readBodyWithLimit = async (request: Request, maxBytes: number) => {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PayloadTooLargeError('Payload excede o limite permitido.');
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('payload_too_large');
        throw new PayloadTooLargeError('Payload excede o limite permitido.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
};

const readString = (object: Record<string, unknown>, key: string) => {
  const value = object[key];
  return typeof value === 'string' && value ? value : null;
};

const readNumber = (object: Record<string, unknown>, key: string) => {
  const value = object[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readMetadataOrderId = (object: Record<string, unknown>) => {
  const metadata = object.metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const orderId = (metadata as Record<string, unknown>).order_id;
    if (typeof orderId === 'string') return orderId;
  }
  return readString(object, 'client_reference_id');
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const provider = (Deno.env.get('PAYMENT_PROVIDER') ?? 'stripe').toLowerCase();
  if (!supabaseUrl || !serviceKey) return json({ error: 'Ambiente indisponível.' }, 503);
  if (provider !== 'stripe') return json({ ignored: true, reason: 'provider_not_enabled' }, 200);

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!webhookSecret) return json({ error: 'Webhook de pagamento não configurado.' }, 503);

  const signature = request.headers.get('stripe-signature') ?? '';
  if (!signature) return json({ error: 'Assinatura não informada.' }, 400);

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType && !contentType.startsWith('application/json')) {
    return json({ error: 'Tipo de conteúdo não suportado.' }, 415);
  }

  let rawPayload: string;
  try {
    rawPayload = await readBodyWithLimit(request, MAX_WEBHOOK_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return json({ error: error.message }, 413);
    }
    return json({ error: 'Não foi possível ler o evento.' }, 400);
  }

  if (!(await verifyStripeSignature(rawPayload, signature, webhookSecret))) {
    return json({ error: 'Assinatura inválida.' }, 400);
  }

  let event: StripeEvent;
  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'Evento inválido.' }, 400);
    }
    event = parsed as StripeEvent;
  } catch {
    return json({ error: 'Evento inválido.' }, 400);
  }
  if (!event.id || !event.type) return json({ error: 'Evento inválido.' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const payloadHash = await sha256(rawPayload);
  const { data: existing } = await admin
    .from('payment_webhook_events')
    .select('id,status')
    .eq('provider', 'stripe')
    .eq('provider_event_id', event.id)
    .maybeSingle();
  if (existing?.status === 'processed' || existing?.status === 'ignored') {
    return json({ received: true, duplicate: true });
  }

  const { data: webhookRecord, error: webhookError } = await admin
    .from('payment_webhook_events')
    .upsert({
      provider: 'stripe',
      provider_event_id: event.id,
      event_type: event.type,
      signature_valid: true,
      payload_sha256: payloadHash,
      payload: event,
      status: 'received',
      error_message: null,
    }, { onConflict: 'provider,provider_event_id' })
    .select('id')
    .single();
  if (webhookError || !webhookRecord) return json({ error: webhookError?.message ?? 'Evento não registrado.' }, 500);

  try {
    const object = event.data?.object ?? {};

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const orderId = readMetadataOrderId(object);
      const paymentStatus = readString(object, 'payment_status');
      const paymentIntent = readString(object, 'payment_intent') ?? readString(object, 'id');
      if (!orderId || !paymentIntent || (event.type === 'checkout.session.completed' && paymentStatus !== 'paid')) {
        await admin.from('payment_webhook_events').update({ status: 'ignored', processed_at: new Date().toISOString() }).eq('id', webhookRecord.id);
        return json({ received: true, ignored: true });
      }

      const { error } = await admin.rpc('service_confirm_canonical_payment', {
        target_order_id: orderId,
        target_provider: 'stripe',
        target_provider_reference: paymentIntent,
        target_payment_method: 'stripe_checkout',
        target_provider_fee_cents: 0,
        target_provider_payload: object,
      });
      if (error) throw new Error(error.message);
    } else if (event.type === 'checkout.session.expired') {
      const orderId = readMetadataOrderId(object);
      const sessionId = readString(object, 'id');
      if (sessionId) {
        await admin.from('payment_attempts').update({ status: 'expired' })
          .eq('provider', 'stripe').eq('provider_reference', sessionId).in('status', ['created', 'pending', 'authorized']);
      }
      if (orderId) {
        await admin.from('commerce_orders').update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('id', orderId).in('status', ['pending', 'processing']);
        await admin.from('commerce_order_events').insert({
          order_id: orderId,
          event_type: 'checkout_expired',
          from_status: 'processing',
          to_status: 'canceled',
          metadata: { stripeEventId: event.id },
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = readString(object, 'id');
      const metadataOrderId = readMetadataOrderId(object);
      if (paymentIntent) {
        await admin.from('payment_attempts').update({
          status: 'failed',
          failure_code: 'payment_failed',
          failure_message: 'Pagamento recusado pelo provedor.',
          provider_payload: object,
        }).eq('provider', 'stripe').eq('provider_reference', paymentIntent);
      }
      if (metadataOrderId) {
        await admin.from('commerce_orders').update({ status: 'failed' })
          .eq('id', metadataOrderId).in('status', ['pending', 'processing']);
      }
    } else if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const paymentIntent = readString(object, 'payment_intent');
      if (!paymentIntent) throw new Error('Pagamento de origem não informado pelo provedor.');

      const { data: payment, error: paymentError } = await admin
        .from('payments')
        .select('order_id,gross_amount_cents,refunded_amount_cents,chargeback_amount_cents')
        .eq('provider', 'stripe')
        .eq('provider_reference', paymentIntent)
        .maybeSingle();
      if (paymentError || !payment) throw new Error(paymentError?.message ?? 'Pagamento canônico não encontrado.');

      const adjustmentType = event.type === 'charge.refunded' ? 'refund' : 'chargeback';
      const currentProviderAmount = event.type === 'charge.refunded'
        ? readNumber(object, 'amount_refunded')
        : readNumber(object, 'amount');
      const alreadyRecorded = adjustmentType === 'refund'
        ? Number(payment.refunded_amount_cents)
        : Number(payment.chargeback_amount_cents);
      const amount = Math.max(0, Number(currentProviderAmount ?? 0) - alreadyRecorded);
      if (amount > 0) {
        const { error } = await admin.rpc('service_record_payment_adjustment', {
          target_order_id: payment.order_id,
          target_adjustment_type: adjustmentType,
          target_amount_cents: amount,
          target_provider_reference: readString(object, 'id'),
          target_idempotency_key: `stripe-event:${event.id}`,
          target_reason: adjustmentType === 'refund' ? 'Reembolso confirmado pelo provedor.' : 'Chargeback aberto no provedor.',
          target_metadata: object,
        });
        if (error) throw new Error(error.message);
      }
    } else {
      await admin.from('payment_webhook_events').update({ status: 'ignored', processed_at: new Date().toISOString() }).eq('id', webhookRecord.id);
      return json({ received: true, ignored: true });
    }

    await admin.from('payment_webhook_events').update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', webhookRecord.id);
    return json({ received: true });
  } catch (error) {
    await admin.from('payment_webhook_events').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Falha desconhecida',
    }).eq('id', webhookRecord.id);
    return json({ error: error instanceof Error ? error.message : 'Falha ao processar evento.' }, 500);
  }
});
