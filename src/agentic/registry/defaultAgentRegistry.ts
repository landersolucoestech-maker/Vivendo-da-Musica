import { architectureAgent } from '@/agentic/agents/architecture.agent';
import { backendAgent } from '@/agentic/agents/backend.agent';
import { databaseAgent } from '@/agentic/agents/database.agent';
import { engineeringOrchestratorAgent } from '@/agentic/agents/engineeringOrchestrator.agent';
import { frontendAgent } from '@/agentic/agents/frontend.agent';
import { qaAgent } from '@/agentic/agents/qa.agent';
import { reviewerAgent } from '@/agentic/agents/reviewer.agent';
import { securityAgent } from '@/agentic/agents/security.agent';
import { AgentRegistry } from '@/agentic/registry/agentRegistry';

export const createDefaultAgentRegistry = (): AgentRegistry => {
  const registry = new AgentRegistry();
  registry.register(engineeringOrchestratorAgent);
  registry.register(architectureAgent);
  registry.register(frontendAgent);
  registry.register(backendAgent);
  registry.register(databaseAgent);
  registry.register(securityAgent);
  registry.register(qaAgent);
  registry.register(reviewerAgent);
  return registry;
};
