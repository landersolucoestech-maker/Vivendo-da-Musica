import {
  agentExecutionRequestSchema,
  type AgentAdmissionDecision,
  type AgentExecutionRequest,
} from '@/agentic/contracts/agentContract';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';

export class DeterministicAgentRuntime {
  constructor(private readonly registry: AgentRegistry) {}

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

    if (agent.humanApprovalFor.includes(request.risk) && !request.approvedByHuman) {
      return {
        allowed: false,
        reason: `Aprovação humana obrigatória para risco ${request.risk}.`,
        agent,
      };
    }

    return {
      allowed: true,
      reason: 'Execução admitida pelos gates determinísticos.',
      agent,
    };
  }
}
