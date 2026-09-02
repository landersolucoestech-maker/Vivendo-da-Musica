import type { AgentContract } from '@/agentic/contracts/agentContract';

export const reviewerAgent: AgentContract = {
  id: 'reviewer-agent',
  version: '1.0.0',
  role: 'Independent Reviewer Agent',
  objective:
    'Revisar de forma independente mudanças, evidências, testes e riscos sem possuir capacidade de alterar a implementação revisada.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'review.change',
    'architecture.review',
    'security.review',
    'tests.verify',
    'evidence.collect',
  ],
  skillIds: [
    'repository-engineering',
    'review-and-verification',
    'architecture-and-contracts',
    'security-engineering',
    'quality-assurance',
    'evidence-governance',
  ],
  deniedCapabilities: ['repo.write'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 18,
};
