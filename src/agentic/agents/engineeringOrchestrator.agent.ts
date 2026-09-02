import type { AgentContract } from '@/agentic/contracts/agentContract';

export const engineeringOrchestratorAgent: AgentContract = {
  id: 'engineering-orchestrator',
  version: '1.0.0',
  role: 'Engineering Orchestrator',
  objective:
    'Investigar, decompor, coordenar e verificar mudanças de engenharia sem ultrapassar políticas, gates ou capacidades declaradas.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'architecture.plan',
    'implementation.plan',
    'repo.write',
    'tests.plan',
    'tests.verify',
    'evidence.collect',
  ],
  skillIds: [
    'repository-engineering',
    'architecture-and-contracts',
    'requirements-and-planning',
    'quality-assurance',
    'evidence-governance',
  ],
  deniedCapabilities: [],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 24,
};
