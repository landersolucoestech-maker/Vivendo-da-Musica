import type { AgentContract } from '@/agentic/contracts/agentContract';

export const observabilityAgent: AgentContract = {
  id: 'observability-agent',
  version: '1.0.0',
  role: 'Observability Agent',
  objective:
    'Inspecionar saúde, logs, métricas, traces e sinais operacionais, produzindo diagnóstico verificável sem alterar produção diretamente.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'observability.inspect',
    'observability.diagnose',
    'observability.verify',
    'evidence.collect',
  ],
  deniedCapabilities: ['repo.write'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 20,
};
