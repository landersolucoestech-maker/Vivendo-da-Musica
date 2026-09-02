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

describe('SupabaseAuditCheckpointTransport', () => {
  it('persiste o checkpoint via RPC e retorna receipt validado', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        persistenceId: '11111111-1111-4111-8111-111111111111',
        headHash: checkpoint.headHash,
        recordCount: checkpoint.recordCount,
        persistedAt: '2026-09-02T07:00:00.000Z',
      },
      error: null,
    });
    const transport = new SupabaseAuditCheckpointTransport(rpc);

    const receipt = await transport.persist(checkpoint, context);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith({ p_checkpoint: checkpoint, p_context: context });
    expect(receipt).toEqual({
      persistenceId: '11111111-1111-4111-8111-111111111111',
      headHash: checkpoint.headHash,
      recordCount: 1,
      persistedAt: '2026-09-02T07:00:00.000Z',
    });
    expect(Object.isFrozen(receipt)).toBe(true);
  });

  it('falha fechado sem vazar detalhes do erro do banco', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'sensitive database detail' },
    });
    const transport = new SupabaseAuditCheckpointTransport(rpc);

    await expect(transport.persist(checkpoint, context)).rejects.toThrow(
      'Falha ao persistir audit checkpoint no Supabase.',
    );
  });

  it('rejeita receipt malformado', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        persistenceId: 'not-a-uuid',
        headHash: checkpoint.headHash,
        recordCount: checkpoint.recordCount,
        persistedAt: 'not-a-date',
      },
      error: null,
    });
    const transport = new SupabaseAuditCheckpointTransport(rpc);

    await expect(transport.persist(checkpoint, context)).rejects.toThrow(
      'Supabase retornou receipt de audit checkpoint inválido.',
    );
  });
});
