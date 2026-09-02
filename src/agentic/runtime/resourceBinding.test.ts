import { describe, expect, it, vi } from 'vitest';

import { createAgenticRuntime } from '@/agentic/runtime/createAgenticRuntime';

describe('agentic resource binding', () => {
  it('blocks repository input that diverges from the manifest-declared resource', async () => {
    const read = vi.fn();
    const runtime = createAgenticRuntime({
      github: { read, search: vi.fn(), write: vi.fn() },
    });

    const correlationId = 'corr-resource-binding';
    runtime.manifests.issue({
      id: 'manifest-resource-binding',
      correlationId,
      workflowId: `${correlationId}:engineering-orchestrator`,
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      allowedResources: ['repo:path:README.md'],
      maxExecutions: 1,
      requiredEvidenceKinds: ['tool_call', 'tool_result'],
      issuedAt: '2026-09-02T05:00:00.000Z',
      expiresAt: '2099-09-02T05:30:00.000Z',
    });

    await expect(runtime.executor.execute({
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
      correlationId,
      idempotencyKey: 'idem-resource-binding',
      executionNonce: 'nonce-resource-binding',
      manifestId: 'manifest-resource-binding',
      resource: 'repo:path:README.md',
      input: { path: 'package.json' },
    })).rejects.toThrow('Resource do adapter divergente');

    expect(read).not.toHaveBeenCalled();
  });

  it('binds deployment adapters to the exact configured Hostinger target', () => {
    const runtime = createAgenticRuntime({
      hostinger: {
        config: { mode: 'vps-docker', targetId: 'vm-1' },
        transport: { deploy: vi.fn() },
      },
    });

    const adapter = runtime.adapters.get('deploy.production', 'privileged');
    expect(() => adapter.validateResource?.(
      { artifactRef: 'ghcr.io/example/app:sha' },
      'hostinger:target:vm-2',
    )).toThrow('Resource de deploy divergente');
  });
});
