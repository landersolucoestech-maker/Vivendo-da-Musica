import type { PolicyRule } from '@/agentic/policy/policyEngine';

export const defaultAgenticPolicies: readonly PolicyRule[] = [
  {
    id: 'allow-declared-read',
    effect: 'allow',
    risks: ['read'],
    reason: 'Operações somente de leitura podem prosseguir quando também admitidas pelo contrato do agente.',
  },
  {
    id: 'allow-declared-write',
    effect: 'allow',
    risks: ['write'],
    reason: 'Operações de escrita podem prosseguir quando também admitidas pelo contrato do agente.',
  },
  {
    id: 'approval-for-privileged',
    effect: 'require_approval',
    risks: ['privileged'],
    reason: 'Operações privilegiadas exigem aprovação humana explícita.',
  },
  {
    id: 'approval-for-destructive',
    effect: 'require_approval',
    risks: ['destructive'],
    reason: 'Operações destrutivas exigem aprovação humana explícita.',
  },
  {
    id: 'orchestrator-no-production-deploy',
    effect: 'deny',
    agentId: 'engineering-orchestrator',
    capability: 'deploy.production',
    reason: 'O Engineering Orchestrator não pode executar deploy de produção.',
  },
];
