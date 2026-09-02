import {
  agentExecutionRequestSchema,
  type AgentAdmissionDecision,
  type AgentExecutionRequest,
} from '@/agentic/contracts/agentContract';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';
import { createDefaultSkillRegistry } from '@/agentic/registry/defaultSkillRegistry';
import type { SkillRegistry } from '@/agentic/registry/skillRegistry';

export class DeterministicAgentRuntime {
  private readonly skills: SkillRegistry;

  constructor(
    private readonly registry: AgentRegistry,
    skills?: SkillRegistry,
  ) {
    this.skills = skills ?? createDefaultSkillRegistry();
    if (!this.skills.isSealed()) this.skills.seal();
  }

  admit(input: AgentExecutionRequest): AgentAdmissionDecision {
    const request = agentExecutionRequestSchema.parse(input);

    let agent;
    try {
      agent = this.registry.get(request.agentId);
    } catch (error) {
      return {
        allowed: false,
        reason: error instanceof Error ? error.message : 'Agente indisponível.',
        agent: null,
      };
    }

    if (!agent.capabilities.includes(request.capability)) {
      return {
        allowed: false,
        reason: `Capability não declarada para ${agent.id}: ${request.capability}`,
        agent,
      };
    }

    if (agent.deniedCapabilities.includes(request.capability)) {
      return {
        allowed: false,
        reason: `Capability explicitamente negada para ${agent.id}: ${request.capability}`,
        agent,
      };
    }

    const skill = this.skills.resolve(request.capability, request.risk);
    if (!skill.allowed || !skill.skill) {
      return {
        allowed: false,
        reason: skill.reason,
        agent,
      };
    }

    if (!agent.skillIds.includes(skill.skill.id)) {
      return {
        allowed: false,
        reason: `Skill não atribuída para ${agent.id}: ${skill.skill.id}`,
        agent,
      };
    }

    if (agent.humanApprovalFor.includes(request.risk) && !request.approvedByHuman) {
      return {
        allowed: false,
        reason: `Aprovação humana obrigatória para risco ${request.risk}.`,
        agent,
      };
    }

    return {
      allowed: true,
      reason: `Execução admitida pelos gates determinísticos via Skill ${skill.skill.id}.`,
      agent,
    };
  }
}
