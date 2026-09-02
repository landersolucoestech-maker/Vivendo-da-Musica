import type { AgentContract } from '@/agentic/contracts/agentContract';

export const securityAgent: AgentContract = {
  id: 'security-agent',
  version: '1.0.0',
  role: 'Security Agent',
  objective:
    'Auditar autenticação, autorização, RLS, secrets, superfícies privilegiadas e mudanças sensíveis, bloqueando operações que violem políticas de segurança.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'security.audit',
    'security.review',
    'security.policy',
    'tests.plan',
    'tests.verify',
    'evidence.collect',
  ],
  skillIds: ['repository-engineering', 'security-engineering', 'quality-assurance', 'evidence-governance'],
  deniedCapabilities: ['repo.write'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 20,
};
