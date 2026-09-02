import { describe, expect, it, vi } from 'vitest';

import type { AuditCheckpointTransport } from '@/agentic/evidence/auditCheckpointTransport';
import { createAgenticRuntime } from '@/agentic/runtime/createAgenticRuntime';

const createAuditTransport = () => {
  const persist = vi.fn<AuditCheckpointTransport['persist']>(async (checkpoint) => ({
    persistenceId: `audit-${checkpoint.recordCount}-${checkpoint.headHash ?? 'empty'}`,
    headHash: checkpoint.headHash,
    recordCount: checkpoint.recordCount,
    persistedAt: '2026-09-02T06:30:00.000Z',
  }));
  return { persist } satisfies AuditCheckpointTransport;
};

const issueReadManifest = (
  runtime: ReturnType<typeof createAgenticRuntime>,
  correlationId: string,
  agentId = 'engineering-orchestrator',
) => runtime.manifests.issue({
  id: `manifest-${correlationId}`,
  correlationId,
  workflowId: `${correlationId}:${agentId}`,
  agentId,
  capability: 'repo.read',
  risk: 'read',
  allowedResources: ['repo:path:README.md'],
  maxExecutions: 1,
  requiredEvidenceKinds: ['tool_call', 'tool_result', 'verification'],
  issuedAt: '2026-09-02T05:00:00.000Z',
  expiresAt: '2099-09-02T05:30:00.000Z',
});

const issueProductionManifest = (
  runtime: ReturnType<typeof createAgenticRuntime>,
  correlationId: string,
  manifestId: string,
) => runtime.manifests.issue({
  id: manifestId,
  correlationId,
  workflowId: `${correlationId}:release-agent`,
  agentId: 'release-agent',
  capability: 'deploy.production',
  risk: 'privileged',
  allowedResources: ['hostinger:target:vm-1'],
  maxExecutions: 1,
  requiredEvidenceKinds: ['tool_call', 'deployment_health', 'tool_result', 'verification'],
  environment: 'production',
  artifactRef: 'ghcr.io/example/app:sha',
  integrityDigest: `sha256:${manifestId}`,
  signature: 'signed-by-control-plane',
  issuedAt: '2026-09-02T05:00:00.000Z',
  expiresAt: '2099-09-02T05:30:00.000Z',
});

const authorizeProduction = (
  runtime: ReturnType<typeof createAgenticRuntime>,
  correlationId: string,
  approvalId: string,
  leaseResource: string,
): void => {
  runtime.approvals.issue({
    id: approvalId,
    correlationId,
    workflowId: `${correlationId}:release-agent`,
    agentId: 'release-agent',
    capability: 'deploy.production',
    approverId: 'human-owner',
    approvedAt: '2026-09-02T05:00:00.000Z',
    expiresAt: '2099-09-02T05:30:00.000Z',
  });
  runtime.leases.acquire(leaseResource, 'release-agent', 60_000);
};

describe('GovernedAgentExecutor', () => {
  it('executes a declared read through manifest, kernel, policy and gateway and leaves workflow verifying', async () => {
    const read = vi.fn().mockResolvedValue({ content: 'ok' });
    const runtime = createAgenticRuntime({ github: { read, search: vi.fn(), write: vi.fn() } });
    issueReadManifest(runtime, 'corr-read');

    const execution = await runtime.executor.execute({
      agentId: 'engineering-orchestrator', capability: 'repo.read', risk: 'read', approvedByHuman: false,
      correlationId: 'corr-read', idempotencyKey: 'idem-read', executionNonce: 'nonce-read',
      manifestId: 'manifest-corr-read', resource: 'repo:path:README.md',
      input: { path: 'README.md', ref: 'dev' },
    });

    expect(read).toHaveBeenCalledOnce();
    expect(execution.result).toEqual({ content: 'ok' });
    expect(execution.workflow.state).toBe('verifying');
    expect(execution.workflow.verified).toBe(false);
    expect(runtime.manifests.executionsUsed('manifest-corr-read')).toBe(1);
    expect(runtime.manifests.hasConsumedNonce('nonce-read')).toBe(true);
    expect(runtime.auditCheckpoints.allReceipts()).toEqual([]);
    expect(runtime.evidence.verifyIntegrity()).toBe(true);
  });

  it('blocks resources outside the manifest scope before the adapter is called', async () => {
    const read = vi.fn();
    const runtime = createAgenticRuntime({ github: { read, search: vi.fn(), write: vi.fn() } });
    issueReadManifest(runtime, 'corr-scope');

    await expect(runtime.executor.execute({
      agentId: 'engineering-orchestrator', capability: 'repo.read', risk: 'read', approvedByHuman: false,
      correlationId: 'corr-scope', idempotencyKey: 'idem-scope', executionNonce: 'nonce-scope',
      manifestId: 'manifest-corr-scope', resource: 'repo:path:.env', input: { path: '.env' },
    })).rejects.toThrow('fora do escopo');
    expect(read).not.toHaveBeenCalled();
  });

  it('closes a workflow only after independent reviewer verification and required evidence pass', async () => {
    const runtime = createAgenticRuntime({
      github: { read: vi.fn().mockResolvedValue({ content: 'ok' }), search: vi.fn(), write: vi.fn() },
    });
    issueReadManifest(runtime, 'corr-verified');
    const execution = await runtime.executor.execute({
      agentId: 'engineering-orchestrator', capability: 'repo.read', risk: 'read', approvedByHuman: false,
      correlationId: 'corr-verified', idempotencyKey: 'idem-verified', executionNonce: 'nonce-verified',
      manifestId: 'manifest-corr-verified', resource: 'repo:path:README.md', input: { path: 'README.md' },
    });

    const completed = await runtime.verification.verify({
      workflowId: execution.workflow.id,
      reviewerAgentId: 'reviewer-agent',
      passed: true,
      reason: 'Evidências e resultado verificados de forma independente.',
    });

    expect(completed.state).toBe('completed');
    expect(completed.verified).toBe(true);
    expect(runtime.workflows.get(execution.workflow.id)?.state).toBe('completed');
    expect(runtime.evidence.byCorrelationId('corr-verified').some((record) => record.kind === 'verification')).toBe(true);
    expect(runtime.evidence.verifyIntegrity()).toBe(true);
  });

  it('prevents an executor from reviewing its own workflow', async () => {
    const runtime = createAgenticRuntime({
      github: { read: vi.fn().mockResolvedValue({ content: 'ok' }), search: vi.fn(), write: vi.fn() },
    });
    issueReadManifest(runtime, 'corr-self-review', 'reviewer-agent');
    const execution = await runtime.executor.execute({
      agentId: 'reviewer-agent', capability: 'repo.read', risk: 'read', approvedByHuman: false,
      correlationId: 'corr-self-review', idempotencyKey: 'idem-self-review', executionNonce: 'nonce-self-review',
      manifestId: 'manifest-corr-self-review', resource: 'repo:path:README.md', input: { path: 'README.md' },
    });

    await expect(runtime.verification.verify({
      workflowId: execution.workflow.id, reviewerAgentId: 'reviewer-agent', passed: true,
    })).rejects.toThrow('não pode aprovar a própria implementação');
    expect(runtime.workflows.get(execution.workflow.id)?.state).toBe('verifying');
  });

  it('turns a rejected independent verification into a terminal failed workflow', async () => {
    const runtime = createAgenticRuntime({
      github: { read: vi.fn().mockResolvedValue({ content: 'bad' }), search: vi.fn(), write: vi.fn() },
    });
    issueReadManifest(runtime, 'corr-rejected');
    const execution = await runtime.executor.execute({
      agentId: 'engineering-orchestrator', capability: 'repo.read', risk: 'read', approvedByHuman: false,
      correlationId: 'corr-rejected', idempotencyKey: 'idem-rejected', executionNonce: 'nonce-rejected',
      manifestId: 'manifest-corr-rejected', resource: 'repo:path:README.md', input: { path: 'README.md' },
    });

    const failed = await runtime.verification.verify({
      workflowId: execution.workflow.id,
      reviewerAgentId: 'reviewer-agent',
      passed: false,
      reason: 'Resultado não satisfaz os critérios de verificação.',
    });

    expect(failed.state).toBe('failed');
    expect(failed.verified).toBe(false);
    expect(failed.failureReason).toContain('não satisfaz');
    expect(runtime.workflows.get(execution.workflow.id)?.state).toBe('failed');
  });

  it('blocks an agent contract denial before a deployment transport can be called', async () => {
    const deploy = vi.fn();
    const runtime = createAgenticRuntime({
      hostinger: { config: { mode: 'vps-docker', targetId: 'vm-1' }, transport: { deploy } },
    });

    await expect(runtime.executor.execute({
      agentId: 'backend-agent', capability: 'deploy.production', risk: 'privileged', approvedByHuman: true,
      correlationId: 'corr-denied', idempotencyKey: 'idem-denied', executionNonce: 'nonce-denied',
      manifestId: 'not-reached', resource: 'hostinger:target:vm-1', artifactRef: 'ghcr.io/example/app:sha',
      input: { artifactRef: 'ghcr.io/example/app:sha' },
    })).rejects.toThrow('Capability explicitamente negada');

    expect(deploy).not.toHaveBeenCalled();
  });

  it('fails closed before touching Hostinger when durable audit transport is absent', async () => {
    const deploy = vi.fn();
    const runtime = createAgenticRuntime({
      manifestSignatureVerifier: { verify: vi.fn().mockReturnValue(true) },
      manifestIntegrityVerifier: { verify: vi.fn().mockReturnValue(true) },
      hostinger: { config: { mode: 'vps-docker', targetId: 'vm-1' }, transport: { deploy } },
    });
    const correlationId = 'corr-no-audit';
    issueProductionManifest(runtime, correlationId, 'manifest-no-audit');
    authorizeProduction(runtime, correlationId, 'approval-no-audit', 'hostinger:no-audit');

    await expect(runtime.executor.execute({
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged', approvedByHuman: true,
      correlationId, idempotencyKey: 'idem-no-audit', executionNonce: 'nonce-no-audit',
      manifestId: 'manifest-no-audit', resource: 'hostinger:target:vm-1',
      artifactRef: 'ghcr.io/example/app:sha', approvalReceiptId: 'approval-no-audit',
      leaseResource: 'hostinger:no-audit', input: { artifactRef: 'ghcr.io/example/app:sha' },
    })).rejects.toThrow('Audit checkpoint transport obrigatório');

    expect(deploy).not.toHaveBeenCalled();
    expect(runtime.workflows.get(`${correlationId}:release-agent`)?.state).toBe('failed');
  });

  it('requires durable pre/post execution and pre-completion checkpoints for healthy Hostinger production deploy', async () => {
    const auditCheckpointTransport = createAuditTransport();
    const deploy = vi.fn().mockResolvedValue({
      deploymentId: 'dep-1', environment: 'production', artifactRef: 'ghcr.io/example/app:sha',
      url: 'https://app.example.test',
    });
    const verifyHealth = vi.fn().mockResolvedValue({
      healthy: true,
      deploymentId: 'dep-1',
      environment: 'production',
      artifactRef: 'ghcr.io/example/app:sha',
      checkedAt: '2026-09-02T06:00:00.000Z',
      statusCode: 200,
      url: 'https://app.example.test',
    });
    const runtime = createAgenticRuntime({
      auditCheckpointTransport,
      manifestSignatureVerifier: { verify: vi.fn().mockReturnValue(true) },
      manifestIntegrityVerifier: { verify: vi.fn().mockReturnValue(true) },
      hostinger: { config: { mode: 'vps-docker', targetId: 'vm-1' }, transport: { deploy, verifyHealth } },
    });

    const correlationId = 'corr-release';
    issueProductionManifest(runtime, correlationId, 'manifest-release-1');
    authorizeProduction(runtime, correlationId, 'approval-release-1', 'hostinger:production');

    const execution = await runtime.executor.execute({
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged', approvedByHuman: true,
      correlationId, idempotencyKey: 'idem-release', executionNonce: 'nonce-release', manifestId: 'manifest-release-1',
      resource: 'hostinger:target:vm-1', artifactRef: 'ghcr.io/example/app:sha',
      approvalReceiptId: 'approval-release-1', leaseResource: 'hostinger:production',
      input: { artifactRef: 'ghcr.io/example/app:sha' },
    });

    expect(deploy).toHaveBeenCalledOnce();
    expect(verifyHealth).toHaveBeenCalledOnce();
    expect(execution.workflow.state).toBe('verifying');
    expect(runtime.evidence.byCorrelationId(correlationId).some((record) =>
      record.kind === 'deployment_health' && record.payload.healthy === true,
    )).toBe(true);

    const completed = await runtime.verification.verify({
      workflowId: execution.workflow.id,
      reviewerAgentId: 'reviewer-agent',
      passed: true,
      reason: 'Deploy e health check validados independentemente.',
    });
    expect(completed.state).toBe('completed');
    expect(auditCheckpointTransport.persist.mock.calls.map((call) => call[1].phase)).toEqual([
      'pre_execution',
      'post_execution',
      'pre_completion',
    ]);
    expect(runtime.auditCheckpoints.allReceipts()).toHaveLength(3);
  });

  it('rejects a divergent durable audit receipt before a sensitive tool executes', async () => {
    const deploy = vi.fn();
    const auditCheckpointTransport: AuditCheckpointTransport = {
      persist: vi.fn(async (checkpoint) => ({
        persistenceId: 'bad-receipt',
        headHash: checkpoint.headHash,
        recordCount: checkpoint.recordCount + 1,
        persistedAt: '2026-09-02T06:30:00.000Z',
      })),
    };
    const runtime = createAgenticRuntime({
      auditCheckpointTransport,
      manifestSignatureVerifier: { verify: vi.fn().mockReturnValue(true) },
      manifestIntegrityVerifier: { verify: vi.fn().mockReturnValue(true) },
      hostinger: { config: { mode: 'vps-docker', targetId: 'vm-1' }, transport: { deploy } },
    });
    const correlationId = 'corr-bad-audit';
    issueProductionManifest(runtime, correlationId, 'manifest-bad-audit');
    authorizeProduction(runtime, correlationId, 'approval-bad-audit', 'hostinger:bad-audit');

    await expect(runtime.executor.execute({
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged', approvedByHuman: true,
      correlationId, idempotencyKey: 'idem-bad-audit', executionNonce: 'nonce-bad-audit',
      manifestId: 'manifest-bad-audit', resource: 'hostinger:target:vm-1',
      artifactRef: 'ghcr.io/example/app:sha', approvalReceiptId: 'approval-bad-audit',
      leaseResource: 'hostinger:bad-audit', input: { artifactRef: 'ghcr.io/example/app:sha' },
    })).rejects.toThrow('recordCount divergente');

    expect(deploy).not.toHaveBeenCalled();
  });

  it('fails closed when Hostinger production health verification is unavailable', async () => {
    const deploy = vi.fn().mockResolvedValue({
      deploymentId: 'dep-unverified', environment: 'production', artifactRef: 'ghcr.io/example/app:sha',
    });
    const runtime = createAgenticRuntime({
      auditCheckpointTransport: createAuditTransport(),
      manifestSignatureVerifier: { verify: vi.fn().mockReturnValue(true) },
      manifestIntegrityVerifier: { verify: vi.fn().mockReturnValue(true) },
      hostinger: { config: { mode: 'vps-docker', targetId: 'vm-1' }, transport: { deploy } },
    });
    const correlationId = 'corr-health-missing';
    issueProductionManifest(runtime, correlationId, 'manifest-health-missing');
    authorizeProduction(runtime, correlationId, 'approval-health-missing', 'hostinger:health-missing');

    await expect(runtime.executor.execute({
      agentId: 'release-agent', capability: 'deploy.production', risk: 'privileged', approvedByHuman: true,
      correlationId, idempotencyKey: 'idem-health-missing', executionNonce: 'nonce-health-missing',
      manifestId: 'manifest-health-missing', resource: 'hostinger:target:vm-1',
      artifactRef: 'ghcr.io/example/app:sha', approvalReceiptId: 'approval-health-missing',
      leaseResource: 'hostinger:health-missing', input: { artifactRef: 'ghcr.io/example/app:sha' },
    })).rejects.toThrow(/Health check/);

    expect(runtime.evidence.byCorrelationId(correlationId).some((record) => record.kind === 'tool_result')).toBe(false);
    expect(runtime.workflows.get(`${correlationId}:release-agent`)?.state).toBe('failed');
  });
});
