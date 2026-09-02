import type { AgentContract } from '@/agentic/contracts/agentContract';

export const productRequirementsAgent: AgentContract = {
  id: 'product-requirements-agent',
  version: '1.0.0',
  role: 'Product/Requirements Agent',
  objective:
    'Transformar objetivos de produto em requisitos, critérios de aceite, riscos e dependências verificáveis sem alterar implementação diretamente.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'product.analyze',
    'requirements.define',
    'acceptance.define',
    'risk.identify',
    'evidence.collect',
  ],
  skillIds: ['repository-engineering', 'requirements-and-planning', 'evidence-governance'],
  deniedCapabilities: ['repo.write'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 18,
};
