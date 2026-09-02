import { engineeringOrchestratorAgent } from '@/agentic/agents/engineeringOrchestrator.agent';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';

export const createDefaultAgentRegistry = (): AgentRegistry => {
  const registry = new AgentRegistry();
  registry.register(engineeringOrchestratorAgent);
  return registry;
};
