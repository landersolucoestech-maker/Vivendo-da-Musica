import type { AgentContract } from '@/agentic/contracts/agentContract';

export const backendAgent: AgentContract = {
  id: 'backend-agent',
  version: '1.0.0',
  role: 'Backend/API Agent',
  objective:
    'Implementar serviços, APIs, integrações e regras de domínio com contratos explícitos, idempotência e testes.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'backend.implement',
    'backend.refactor',
    'api.contract',
    'api.review',
    'tests.plan',
    'tests.execute',
    'evidence.collect',
    'deploy.production',
  ],
  skillIds: ['repository-engineering', 'backend-api-engineering', 'quality-assurance', 'evidence-governance'],
  deniedCapabilities: ['deploy.production'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 30,
};
