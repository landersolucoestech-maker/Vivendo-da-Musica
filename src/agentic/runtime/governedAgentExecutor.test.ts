import { describe, expect, it, vi } from 'vitest';

import { createAgenticRuntime } from '@/agentic/runtime/createAgenticRuntime';

describe('GovernedAgentExecutor', () => {
  it('executes a declared read through kernel, policy and gateway and leaves workflow verifying', async () => {
    const read = vi.fn().mockResolvedValue({ content: 'ok' });
    const runtime = createAgenticRuntime({
      github: { read, search: vi.fn(), write: vi.fn() },
    });

    const execution = await runtime.executor.execute({
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
      correlationId: 'corr-read',
      idempotencyKey: 'idem-read',
      input: { path: 'README.md', ref: 'dev' },
    });

    expect(read).toHaveBeenCalledOnce();
    expect(execution.result).toEqual({ content: 'ok' });
    expect(execution.workflow.state).toBe('verifying');
    expect(execution.workflow.verified).toBe(false);
    expect(runtime.evidence.verifyIntegrity()).toBe(true);
  });

  it('blocks an agent contract denial before a deployment transport can be called', async () => {
    const deploy = vi.fn();
    const runtime = createAgenticRuntime({
      hostinger: {
        config: { mode: 'vps-docker', targetId: 'vm-1' },
        transport: { deploy },
      },
    });

    await expect(runtime.executor.execute({
      agentId: 'backend-agent',
      capability: 'deploy.production',
      risk: 'privileged',
      approvedByHuman: true,
      correlationId: 'corr-denied',
      idempotencyKey: 'idem-denied',
      input: { artifactRef: 'ghcr.io/example/app:sha' },
    })).rejects.toThrow('Capability explicitamente negada');

    expect(deploy).not.toHaveBeenCalled();
  });

  it('requires a bound approval receipt and lease before Hostinger production deploy', async () => {
    const deploy = vi.fn().mockResolvedValue({
      deploymentId: 'dep-1',
      environment: 'production',
      artifactRef: 'ghcr.io/example/app:sha',
    });
    const runtime = createAgenticRuntime({
      hostinger: {
        config: { mode: 'vps-docker', targetId: 'vm-1' },
        transport: { deploy },
      },
    });

    const correlationId = 'corr-release';
    const workflowId = `${correlationId}:release-agent`;
    runtime.approvals.issue({
      id: 'approval-release-1',
      correlationId,
      workflowId,
      agentId: 'release-agent',
      capability: 'deploy.production',
      approverId: 'human-owner',
      approvedAt: '2026-09-02T05:00:00.000Z',
      expiresAt: '2099-09-02T05:30:00.000Z',
    });
    runtime.leases.acquire('hostinger:production', 'release-agent', 60_000);

    const execution = await runtime.executor.execute({
      agentId: 'release-agent',
      capability: 'deploy.production',
      risk: 'privileged',
      approvedByHuman: true,
      correlationId,
      idempotencyKey: 'idem-release',
      approvalReceiptId: 'approval-release-1',
      leaseResource: 'hostinger:production',
      input: { artifactRef: 'ghcr.io/example/app:sha' },
    });

    expect(deploy).toHaveBeenCalledOnce();
    expect(execution.workflow.state).toBe('verifying');
  });
});
