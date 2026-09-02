import { architectureAgent } from '@/agentic/agents/architecture.agent';
import { engineeringOrchestratorAgent } from '@/agentic/agents/engineeringOrchestrator.agent';
import { qaAgent } from '@/agentic/agents/qa.agent';
import { reviewerAgent } from '@/agentic/agents/reviewer.agent';
import { securityAgent } from '@/agentic/agents/security.agent';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';

export const createDefaultAgentRegistry = (): AgentRegistry => {
  const registry = new AgentRegistry();
  registry.register(engineeringOrchestratorAgent);
  registry.register(architectureAgent);
  registry.register(securityAgent);
  registry.register(qaAgent);
  registry.register(reviewerAgent);
  return registry;
};
