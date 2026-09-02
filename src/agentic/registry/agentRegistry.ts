import { agentContractSchema, type AgentContract } from '@/agentic/contracts/agentContract';

export class AgentRegistry {
  private readonly agents = new Map<string, AgentContract>();
  private sealed = false;

  register(input: AgentContract): AgentContract {
    if (this.sealed) throw new Error('AgentRegistry selado; novos agentes não podem ser registrados.');
    const agent = agentContractSchema.parse(input);
    if (this.agents.has(agent.id)) {
      throw new Error(`Agente já registrado: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
    return agent;
  }

  seal(): void {
    this.sealed = true;
  }

  isSealed(): boolean {
    return this.sealed;
  }

  get(agentId: string): AgentContract {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agente não registrado: ${agentId}`);
    if (!agent.enabled) throw new Error(`Agente desabilitado: ${agentId}`);
    return agent;
  }

  list(): AgentContract[] {
    return [...this.agents.values()];
  }
}
