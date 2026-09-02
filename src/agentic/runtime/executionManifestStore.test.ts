import { describe, expect, it, vi } from 'vitest';

import type { ExecutionManifestInput } from '@/agentic/contracts/executionManifest';
import { ExecutionManifestStore } from '@/agentic/runtime/executionManifestStore';

const readManifest = {
  id: 'manifest-read',
  correlationId: 'corr-read',
  workflowId: 'corr-read:engineering-orchestrator',
  agentId: 'engineering-orchestrator',
  capability: 'repo.read',
  risk: 'read',
  allowedResources: ['repo:path:src/*'],
  maxExecutions: 1,
  requiredEvidenceKinds: ['tool_call', 'tool_result'],
  issuedAt: '2026-09-02T05:00:00.000Z',
  expiresAt: '2099-09-02T05:30:00.000Z',
} satisfies ExecutionManifestInput;

const readContext = {
  correlationId: 'corr-read',
  workflowId: 'corr-read:engineering-orchestrator',
  agentId: 'engineering-orchestrator',
  capability: 'repo.read',
  risk: 'read' as const,
  resource: 'repo:path:src/App.tsx',
  executionNonce: 'nonce-read-1',
  idempotencyKey: 'idem-read-1',
};

describe('ExecutionManifestStore', () => {
  it('enforces resource scope and execution budget', () => {
    const store = new ExecutionManifestStore();
    store.issue(readManifest);

    expect(() => store.assertAndConsume('manifest-read', readContext)).not.toThrow();
    expect(store.executionsUsed('manifest-read')).toBe(1);

    expect(() => store.assertAndConsume('manifest-read', {
      ...readContext,
      executionNonce: 'nonce-read-2',
      idempotencyKey: 'idem-read-2',
    })).toThrow('Budget');
  });

  it('allows an exact idempotent nonce replay without consuming budget twice', () => {
    const store = new ExecutionManifestStore();
    store.issue(readManifest);
    store.assertAndConsume('manifest-read', readContext);
    expect(() => store.assertAndConsume('manifest-read', readContext)).not.toThrow();
    expect(store.executionsUsed('manifest-read')).toBe(1);
    expect(store.hasConsumedNonce('nonce-read-1')).toBe(true);
  });

  it('revalidates manifest expiry before accepting an idempotent nonce replay', () => {
    const store = new ExecutionManifestStore();
    store.issue(readManifest);
    store.assertAndConsume('manifest-read', readContext, new Date('2026-09-02T05:10:00.000Z'));
    expect(() => store.assertAndConsume(
      'manifest-read',
      readContext,
      new Date('2100-09-02T05:10:00.000Z'),
    )).toThrow('expirado');
    expect(store.executionsUsed('manifest-read')).toBe(1);
  });

  it('rejects nonce reuse when the operation binding changes', () => {
    const store = new ExecutionManifestStore();
    store.issue(readManifest);
    store.assertAndConsume('manifest-read', readContext);
    expect(() => store.assertAndConsume('manifest-read', {
      ...readContext,
      resource: 'repo:path:src/Other.tsx',
      idempotencyKey: 'idem-read-tampered',
    })).toThrow('Replay de execution nonce');
    expect(store.executionsUsed('manifest-read')).toBe(1);
  });

  it('denies a resource outside an explicit scope before consuming budget', () => {
    const store = new ExecutionManifestStore();
    store.issue(readManifest);
    expect(() => store.assertAndConsume('manifest-read', {
      ...readContext,
      executionNonce: 'nonce-scope',
      idempotencyKey: 'idem-scope',
      resource: 'repo:path:.env',
    })).toThrow('fora do escopo');
    expect(store.executionsUsed('manifest-read')).toBe(0);
  });

  it('fails closed on privileged execution without a valid signature verifier', () => {
    const verify = vi.fn().mockReturnValue(false);
    const store = new ExecutionManifestStore({ verify });
    store.issue({
      id: 'manifest-prod', correlationId: 'corr-prod', workflowId: 'corr-prod:release-agent',
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged',
      allowedResources: ['hostinger:target:vm-1'], maxExecutions: 1,
      requiredEvidenceKinds: ['tool_call', 'tool_result', 'verification'],
      environment: 'production', artifactRef: 'ghcr.io/example/app:sha', signature: 'invalid-signature',
      issuedAt: '2026-09-02T05:00:00.000Z', expiresAt: '2099-09-02T05:30:00.000Z',
    });

    expect(() => store.assertAndConsume('manifest-prod', {
      correlationId: 'corr-prod', workflowId: 'corr-prod:release-agent', agentId: 'release-agent',
      capability: 'deploy.production', risk: 'privileged', resource: 'hostinger:target:vm-1',
      artifactRef: 'ghcr.io/example/app:sha', executionNonce: 'nonce-prod', idempotencyKey: 'idem-prod',
    })).toThrow('Assinatura');
    expect(store.executionsUsed('manifest-prod')).toBe(0);
  });

  it('rejects production release manifests with wildcard target or missing verification evidence', () => {
    const store = new ExecutionManifestStore();
    expect(() => store.issue({
      id: 'manifest-unsafe-prod', correlationId: 'corr-prod', workflowId: 'corr-prod:release-agent',
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged',
      allowedResources: ['hostinger:target:*'], maxExecutions: 1,
      requiredEvidenceKinds: ['tool_call', 'tool_result'], environment: 'production',
      artifactRef: 'ghcr.io/example/app:sha', signature: 'signed',
      issuedAt: '2026-09-02T05:00:00.000Z', expiresAt: '2099-09-02T05:30:00.000Z',
    })).toThrow(/target Hostinger exato|evidências obrigatórias/);
  });
});
