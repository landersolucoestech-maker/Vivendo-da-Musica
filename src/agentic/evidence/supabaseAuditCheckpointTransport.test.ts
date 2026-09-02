import { describe, expect, it, vi } from 'vitest';
import type { AuditCheckpointContext } from '@/agentic/evidence/auditCheckpointTransport';
import type { EvidenceCheckpoint } from '@/agentic/evidence/evidenceStore';
import { SupabaseAuditCheckpointTransport } from '@/agentic/evidence/supabaseAuditCheckpointTransport';

const checkpoint: Readonly<EvidenceCheckpoint> = Object.freeze({
  version: 1,
  recordCount: 1,
  headHash: 'fnv1a32:deadbeef',
  records: Object.freeze([Object.freeze({
    id: 'evidence-1',
    correlationId: 'corr-1',
    workflowId: 'workflow-1',
    agentId: 'release-agent',
    kind: 'tool_call' as const,
    sequence: 0,
    occurredAt: '2026-09-02T06:55:00.000Z',
    payload: Object.freeze({ capability: 'deploy.production' }),
    previousHash: null,
    hash: 'fnv1a32:deadbeef',
  })]),
});

const context: Readonly<AuditCheckpointContext> = Object.freeze({
  phase: 'pre_execution',
  correlationId: 'corr-1',
  workflowId: 'workflow-1',
  agentId: 'release-agent',
  capability: 'deploy.production',
  risk: 'privileged',
});

const digest = 'a'.repeat(64);
const createClient = (result: unknown) => ({
  rpc: vi.fn().mockResolvedValue(result),
});

describe('SupabaseAuditCheckpointTransport', () => {
  it('persiste pelo RPC privilegiado e exige digest SHA-256 do banco', async () => {
    const client = createClient({
      data: {
        persistenceId: '11111111-1111-4111-8111-111111111111',
        headHash: checkpoint.headHash,
        recordCount: checkpoint.recordCount,
        persistedAt: '2026-09-02T07:00:00.000Z',
        checkpointDigest: digest,
      },
      error: null,
    });
    const transport = new SupabaseAuditCheckpointTransport(client);

    const receipt = await transport.persist(checkpoint, context);

    expect(client.rpc).toHaveBeenCalledOnce();
    expect(client.rpc).toHaveBeenCalledWith(
      'persist_agentic_audit_checkpoint',
      { p_checkpoint: checkpoint, p_context: context },
    );
    expect(receipt).toEqual({
      persistenceId: '11111111-1111-4111-8111-111111111111',
      headHash: checkpoint.headHash,
      recordCount: 1,
      persistedAt: '2026-09-02T07:00:00.000Z',
      checkpointDigest: digest,
    });
    expect(Object.isFrozen(receipt)).toBe(true);
  });

  it('falha fechado sem vazar detalhes do erro do banco', async () => {
    const client = createClient({
      data: null,
      error: { message: 'sensitive database detail' },
    });
    const transport = new SupabaseAuditCheckpointTransport(client);

    await expect(transport.persist(checkpoint, context)).rejects.toThrow(
      'Falha ao persistir audit checkpoint no Supabase.',
    );
  });

  it('rejeita receipt sem digest criptográfico válido', async () => {
    const client = createClient({
      data: {
        persistenceId: '11111111-1111-4111-8111-111111111111',
        headHash: checkpoint.headHash,
        recordCount: checkpoint.recordCount,
        persistedAt: '2026-09-02T07:00:00.000Z',
        checkpointDigest: 'not-sha256',
      },
      error: null,
    });
    const transport = new SupabaseAuditCheckpointTransport(client);

    await expect(transport.persist(checkpoint, context)).rejects.toThrow(
      'Supabase retornou receipt de audit checkpoint inválido.',
    );
  });
});
