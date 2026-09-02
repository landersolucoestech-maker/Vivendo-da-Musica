import type { AgentContract } from '@/agentic/contracts/agentContract';

export const releaseAgent: AgentContract = {
  id: 'release-agent',
  version: '1.0.0',
  role: 'Release Agent',
  objective:
    'Coordenar promoção de releases, validação de gates, deploy e rollback somente quando evidências e aprovações obrigatórias estiverem presentes.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'release.inspect',
    'release.plan',
    'release.promote',
    'migration.verify',
    'deploy.staging',
    'deploy.production',
    'rollback.production',
    'tests.verify',
    'evidence.collect',
  ],
  skillIds: [
    'repository-engineering',
    'release-and-deployment',
    'database-migration-safety',
    'quality-assurance',
    'evidence-governance',
  ],
  deniedCapabilities: [],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 24,
};
