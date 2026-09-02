import { AgentRegistry } from '@/agentic/registry/agentRegistry';

export interface DelegationRequest {
  correlationId: string;
  workflowId: string;
  fromAgentId: string;
  toAgentId: string;
  capability: string;
  lineage: string[];
}

export class DelegationProtocol {
  constructor(private readonly registry: AgentRegistry, private readonly maxDepth = 4) {}

  admit(request: DelegationRequest): void {
    if (request.fromAgentId === request.toAgentId) throw new Error('Agente não pode delegar para si mesmo.');
    if (request.lineage.length >= this.maxDepth) throw new Error(`Profundidade máxima de delegação excedida (${this.maxDepth}).`);
    if (request.lineage.includes(request.toAgentId)) throw new Error(`Ciclo de delegação detectado: ${request.toAgentId}`);

    this.registry.get(request.fromAgentId);
    const target = this.registry.get(request.toAgentId);
    if (!target.capabilities.includes(request.capability)) {
      throw new Error(`Agente delegado não possui capability ${request.capability}: ${target.id}`);
    }
    if (target.deniedCapabilities.includes(request.capability)) {
      throw new Error(`Capability negada no agente delegado ${target.id}: ${request.capability}`);
    }
  }
}
