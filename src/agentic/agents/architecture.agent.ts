import type { AgentContract } from '@/agentic/contracts/agentContract';

export const architectureAgent: AgentContract = {
  id: 'architecture-agent',
  version: '1.0.0',
  role: 'Architecture Agent',
  objective:
    'Analisar fronteiras, dependências, contratos e impactos arquiteturais antes de mudanças estruturais, sem executar alterações destrutivas.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'architecture.inspect',
    'architecture.plan',
    'contracts.review',
    'evidence.collect',
  ],
  deniedCapabilities: ['repo.write'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 18,
};
