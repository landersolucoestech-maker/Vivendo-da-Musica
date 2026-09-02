import type { AgentContract } from '@/agentic/contracts/agentContract';

export const qaAgent: AgentContract = {
  id: 'qa-agent',
  version: '1.0.0',
  role: 'QA Agent',
  objective:
    'Planejar, executar e interpretar verificações automatizadas e critérios de aceite sem modificar código de produção.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'tests.plan',
    'tests.execute',
    'tests.verify',
    'quality.review',
    'evidence.collect',
  ],
  deniedCapabilities: ['repo.write'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 22,
};
