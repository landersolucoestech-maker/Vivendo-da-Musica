import type { AgentContract } from '@/agentic/contracts/agentContract';

export const performanceAgent: AgentContract = {
  id: 'performance-agent',
  version: '1.0.0',
  role: 'Performance Agent',
  objective:
    'Detectar regressões, medir gargalos e implementar otimizações comprováveis sem reduzir segurança, correção ou observabilidade.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'performance.measure',
    'performance.profile',
    'performance.optimize',
    'tests.execute',
    'tests.verify',
    'evidence.collect',
    'deploy.production',
  ],
  skillIds: ['repository-engineering', 'performance-engineering', 'quality-assurance', 'evidence-governance'],
  deniedCapabilities: ['deploy.production'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 26,
};
