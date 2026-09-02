import { describe, expect, it } from 'vitest';

import type { AgentContract } from '@/agentic/contracts/agentContract';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';
import { DeterministicAgentRuntime } from '@/agentic/runtime/deterministicAgentRuntime';

const contract: AgentContract = {
  id: 'engineering-orchestrator',
  version: '1.0.0',
  role: 'Engineering Orchestrator',
  objective: 'Coordenar trabalho técnico somente dentro de capacidades autorizadas.',
  enabled: true,
  capabilities: ['repo.read', 'repo.write', 'repo.delete'],
  deniedCapabilities: ['repo.delete'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 12,
};

const buildRuntime = () => {
  const registry = new AgentRegistry();
  registry.register(contract);
  return new DeterministicAgentRuntime(registry);
};

describe('DeterministicAgentRuntime', () => {
  it('denies undeclared capabilities', () => {
    const decision = buildRuntime().admit({
      agentId: contract.id,
      capability: 'billing.refund',
      risk: 'write',
      approvedByHuman: false,
      correlationId: 'test-1',
    });
    expect(decision.allowed).toBe(false);
  });

  it('denies explicitly blocked capabilities even with human approval', () => {
    const decision = buildRuntime().admit({
      agentId: contract.id,
      capability: 'repo.delete',
      risk: 'destructive',
      approvedByHuman: true,
      correlationId: 'test-2',
    });
    expect(decision.allowed).toBe(false);
  });

  it('requires human approval for privileged risk', () => {
    const decision = buildRuntime().admit({
      agentId: contract.id,
      capability: 'repo.write',
      risk: 'privileged',
      approvedByHuman: false,
      correlationId: 'test-3',
    });
    expect(decision.allowed).toBe(false);
  });

  it('admits an authorized low-risk execution', () => {
    const decision = buildRuntime().admit({
      agentId: contract.id,
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
      correlationId: 'test-4',
    });
    expect(decision.allowed).toBe(true);
  });
});
