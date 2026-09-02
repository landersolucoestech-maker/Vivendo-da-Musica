import { z } from 'zod';
import type {
  AuditCheckpointContext,
  AuditCheckpointReceipt,
  AuditCheckpointTransport,
} from '@/agentic/evidence/auditCheckpointTransport';
import type { EvidenceCheckpoint } from '@/agentic/evidence/evidenceStore';

const receiptSchema = z.object({
  persistenceId: z.string().uuid(),
  headHash: z.string().nullable(),
  recordCount: z.number().int().nonnegative(),
  persistedAt: z.string().datetime(),
  checkpointDigest: z.string().regex(/^[0-9a-f]{64}$/),
});

export interface SupabaseAuditCheckpointRpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export interface SupabaseAuditCheckpointClient {
  rpc(
    functionName: 'persist_agentic_audit_checkpoint',
    params: Readonly<{
      p_checkpoint: Readonly<EvidenceCheckpoint>;
      p_context: Readonly<AuditCheckpointContext>;
    }>,
  ): PromiseLike<Readonly<SupabaseAuditCheckpointRpcResult>>;
}

/**
 * Control-plane only transport.
 *
 * The caller must provide a server-side Supabase client authorized as
 * service_role. No privileged key is read, imported or exposed by this module.
 */
export class SupabaseAuditCheckpointTransport implements AuditCheckpointTransport {
  constructor(private readonly client: SupabaseAuditCheckpointClient) {}

  async persist(
    checkpoint: Readonly<EvidenceCheckpoint>,
    context: Readonly<AuditCheckpointContext>,
  ): Promise<Readonly<AuditCheckpointReceipt>> {
    const result = await this.client.rpc(
      'persist_agentic_audit_checkpoint',
      Object.freeze({
        p_checkpoint: checkpoint,
        p_context: context,
      }),
    );

    if (result.error) {
      throw new Error('Falha ao persistir audit checkpoint no Supabase.');
    }

    const parsed = receiptSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new Error('Supabase retornou receipt de audit checkpoint inválido.');
    }

    const receipt: AuditCheckpointReceipt = {
      persistenceId: parsed.data.persistenceId!,
      headHash: parsed.data.headHash ?? null,
      recordCount: parsed.data.recordCount!,
      persistedAt: parsed.data.persistedAt!,
      checkpointDigest: parsed.data.checkpointDigest!,
    };

    return Object.freeze(receipt);
  }
}

export const createSupabaseAuditCheckpointTransport = (
  client: SupabaseAuditCheckpointClient,
): AuditCheckpointTransport => new SupabaseAuditCheckpointTransport(client);
