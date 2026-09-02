import { describe, expect, it, vi } from 'vitest';

import { SkillRegistry } from '@/agentic/registry/skillRegistry';
import { createAgenticRuntime } from '@/agentic/runtime/createAgenticRuntime';
import { WorkflowVerificationService } from '@/agentic/runtime/workflowVerificationService';

const issueReadManifest = (
  runtime: ReturnType<typeof createAgenticRuntime>,
  correlationId: string,
) => runtime.manifests.issue({
  id: `manifest-${correlationId}`,
  correlationId,
  workflowId: `${correlationId}:engineering-orchestrator`,
  agentId: 'engineering-orchestrator',
  capability: 'repo.read',
  risk: 'read',
  allowedResources: ['repo:path:README.md'],
  maxExecutions: 1,
  requiredEvidenceKinds: ['tool_call', 'tool_result', 'verification'],
  issuedAt: '2026-09-02T05:00:00.000Z',
  expiresAt: '2099-09-02T05:30:00.000Z',
});

describe('Agent/Skill workflow version pinning', () => {
  it('persists the exact agent and skill versions used for workflow admission', async () => {
    const runtime = createAgenticRuntime({
      github: { read: vi.fn().mockResolvedValue({ content: 'ok' }), search: vi.fn(), write: vi.fn() },
    });
    issueReadManifest(runtime, 'corr-version-pin');

    const execution = await runtime.executor.execute({
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
      correlationId: 'corr-version-pin',
      idempotencyKey: 'idem-version-pin',
      executionNonce: 'nonce-version-pin',
      manifestId: 'manifest-corr-version-pin',
      resource: 'repo:path:README.md',
      input: { path: 'README.md', ref: 'dev' },
    });

    const admission = runtime.evidence.byCorrelationId('corr-version-pin').find((record) =>
      record.workflowId === execution.workflow.id
      && record.kind === 'admission'
      && record.payload.manifestId === 'manifest-corr-version-pin',
    );

    expect(admission?.payload.agentVersion).toBe('1.0.0');
    expect(admission?.payload.skillId).toBe('repository-engineering');
    expect(admission?.payload.skillVersion).toBe('1.0.0');
  });

  it('fails closed when the skill version changes before independent workflow completion', async () => {
    const runtime = createAgenticRuntime({
      github: { read: vi.fn().mockResolvedValue({ content: 'ok' }), search: vi.fn(), write: vi.fn() },
    });
    issueReadManifest(runtime, 'corr-skill-drift');

    const execution = await runtime.executor.execute({
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
      correlationId: 'corr-skill-drift',
      idempotencyKey: 'idem-skill-drift',
      executionNonce: 'nonce-skill-drift',
      manifestId: 'manifest-corr-skill-drift',
      resource: 'repo:path:README.md',
      input: { path: 'README.md', ref: 'dev' },
    });

    const driftedSkills = new SkillRegistry();
    for (const skill of runtime.skills.list()) {
      driftedSkills.register(skill.id === 'repository-engineering'
        ? { ...skill, version: '2.0.0' }
        : skill);
    }
    driftedSkills.seal();

    const verifierAfterUpgrade = new WorkflowVerificationService(
      runtime.registry,
      driftedSkills,
      runtime.workflows,
      runtime.evidence,
      runtime.manifests,
      runtime.auditCheckpoints,
    );

    await expect(verifierAfterUpgrade.verify({
      workflowId: execution.workflow.id,
      reviewerAgentId: 'reviewer-agent',
      passed: true,
      reason: 'Tentativa de fechar workflow após upgrade da Skill.',
    })).rejects.toThrow('Skill version drift detectado');

    expect(runtime.workflows.get(execution.workflow.id)?.state).toBe('verifying');
    expect(runtime.evidence.byCorrelationId('corr-skill-drift').some((record) => record.kind === 'verification')).toBe(false);
  });
});
