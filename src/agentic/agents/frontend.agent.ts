import type { AgentContract } from '@/agentic/contracts/agentContract';

export const frontendAgent: AgentContract = {
  id: 'frontend-agent',
  version: '1.0.0',
  role: 'Frontend Agent',
  objective:
    'Implementar interfaces, acessibilidade, estados de interação e integrações frontend respeitando design system, contratos e testes.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'frontend.implement',
    'frontend.refactor',
    'ui.review',
    'tests.plan',
    'tests.execute',
    'evidence.collect',
    'deploy.production',
  ],
  deniedCapabilities: ['deploy.production'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 28,
};
