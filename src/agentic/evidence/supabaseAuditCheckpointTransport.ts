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
});

export interface SupabaseAuditCheckpointRpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export type SupabaseAuditCheckpointRpc = (params: Readonly<{
  p_checkpoint: Readonly<EvidenceCheckpoint>;
  p_context: Readonly<AuditCheckpointContext>;
}>) => PromiseLike<Readonly<SupabaseAuditCheckpointRpcResult>>;

/**
 * Control-plane only transport.
 *
 * The caller is responsible for providing an RPC implementation backed by a
 * server-side Supabase client authorized as service_role. No privileged key is
 * read, imported or exposed by this module.
 */
export class SupabaseAuditCheckpointTransport implements AuditCheckpointTransport {
  constructor(private readonly rpc: SupabaseAuditCheckpointRpc) {}

  async persist(
    checkpoint: Readonly<EvidenceCheckpoint>,
    context: Readonly<AuditCheckpointContext>,
  ): Promise<Readonly<AuditCheckpointReceipt>> {
    const result = await this.rpc(Object.freeze({
      p_checkpoint: checkpoint,
      p_context: context,
    }));

    if (result.error) {
      throw new Error('Falha ao persistir audit checkpoint no Supabase.');
    }

    const parsed = receiptSchema.safeParse(result.data);
    if (!parsed.success) {
      throw new Error('Supabase retornou receipt de audit checkpoint inválido.');
    }

    return Object.freeze({ ...parsed.data });
  }
}

export const createSupabaseAuditCheckpointTransport = (
  rpc: SupabaseAuditCheckpointRpc,
): AuditCheckpointTransport => new SupabaseAuditCheckpointTransport(rpc);
