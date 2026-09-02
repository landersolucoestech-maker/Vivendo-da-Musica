import { describe, expect, it } from 'vitest';

import { engineeringOrchestratorAgent } from '@/agentic/agents/engineeringOrchestrator.agent';
import { EvidenceStore } from '@/agentic/evidence/evidenceStore';
import { PolicyEngine } from '@/agentic/policy/policyEngine';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';

import { AgentExecutionKernel } from './agentExecutionKernel';

const createRegistry = () => {
  const registry = new AgentRegistry();
  registry.register(engineeringOrchestratorAgent);
  return registry;
};

describe('AgentExecutionKernel', () => {
  it('admits only when contract and policy both allow execution', () => {
    const evidence = new EvidenceStore();
    const kernel = new AgentExecutionKernel(
      createRegistry(),
      new PolicyEngine([
        { id: 'read', effect: 'allow', risks: ['read'], reason: 'Leitura permitida.' },
      ]),
      evidence,
    );

    const result = kernel.admit({
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
      correlationId: 'corr-read',
    });

    expect(result.allowed).toBe(true);
    expect(result.workflow?.current().maxSteps).toBe(engineeringOrchestratorAgent.maxSteps);
    expect(evidence.byCorrelationId('corr-read').map((item) => item.kind)).toEqual(['admission', 'policy']);
    expect(evidence.verifyIntegrity()).toBe(true);
  });

  it('stops before policy when capability is not in the agent contract', () => {
    const evidence = new EvidenceStore();
    const kernel = new AgentExecutionKernel(
      createRegistry(),
      new PolicyEngine([
        { id: 'wildcard-read', effect: 'allow', reason: 'Policy isoladamente permissiva.' },
      ]),
      evidence,
    );

    const result = kernel.admit({
      agentId: 'engineering-orchestrator',
      capability: 'deploy.production',
      risk: 'privileged',
      approvedByHuman: true,
      correlationId: 'corr-denied-contract',
    });

    expect(result.allowed).toBe(false);
    expect(result.policy).toBeNull();
    expect(evidence.byCorrelationId('corr-denied-contract')).toHaveLength(1);
  });

  it('keeps policy deny authoritative even for a declared capability', () => {
    const evidence = new EvidenceStore();
    const kernel = new AgentExecutionKernel(
      createRegistry(),
      new PolicyEngine([
        {
          id: 'freeze-writes',
          effect: 'deny',
          capability: 'repo.write',
          reason: 'Janela de freeze ativa.',
        },
      ]),
      evidence,
    );

    const result = kernel.admit({
      agentId: 'engineering-orchestrator',
      capability: 'repo.write',
      risk: 'write',
      approvedByHuman: true,
      correlationId: 'corr-policy-deny',
    });

    expect(result.allowed).toBe(false);
    expect(result.policy?.effect).toBe('deny');
    expect(result.workflow).toBeNull();
  });
});
