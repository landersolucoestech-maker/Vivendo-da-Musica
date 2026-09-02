import { describe, expect, it } from 'vitest';

import type { AgentContract } from '@/agentic/contracts/agentContract';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';
import { createDefaultAgentRegistry } from '@/agentic/registry/defaultAgentRegistry';
import { createDefaultSkillRegistry } from '@/agentic/registry/defaultSkillRegistry';
import { assertAgentSkillConsistency } from '@/agentic/runtime/agentSkillConsistency';

const buildRegistry = (agent: AgentContract): AgentRegistry => {
  const registry = new AgentRegistry();
  registry.register(agent);
  return registry;
};

const baseAgent: AgentContract = {
  id: 'skill-consistency-probe',
  version: '1.0.0',
  role: 'Skill Consistency Probe',
  objective: 'Validar invariantes agente-skill.',
  enabled: true,
  capabilities: ['repo.read'],
  skillIds: ['repository-engineering'],
  deniedCapabilities: [],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 4,
};

describe('assertAgentSkillConsistency', () => {
  it('accepts the complete default agent and skill graph', () => {
    expect(() =>
      assertAgentSkillConsistency(createDefaultAgentRegistry(), createDefaultSkillRegistry()),
    ).not.toThrow();
  });

  it('rejects agents that reference an unknown skill', () => {
    const agent: AgentContract = {
      ...baseAgent,
      skillIds: ['missing-skill'],
    };

    expect(() =>
      assertAgentSkillConsistency(buildRegistry(agent), createDefaultSkillRegistry()),
    ).toThrow(/references unavailable Skill missing-skill/);
  });

  it('rejects capabilities whose resolved skill is not assigned to the agent', () => {
    const agent: AgentContract = {
      ...baseAgent,
      skillIds: ['quality-assurance'],
    };

    expect(() =>
      assertAgentSkillConsistency(buildRegistry(agent), createDefaultSkillRegistry()),
    ).toThrow(/resolves to unassigned Skill repository-engineering/);
  });

  it('rejects capabilities that do not resolve to exactly one registered skill', () => {
    const agent: AgentContract = {
      ...baseAgent,
      capabilities: ['unknown.inspect'],
    };

    expect(() =>
      assertAgentSkillConsistency(buildRegistry(agent), createDefaultSkillRegistry()),
    ).toThrow(/must resolve to exactly one Skill; found 0/);
  });
});
