import type { AgentContract } from '@/agentic/contracts/agentContract';

export const databaseAgent: AgentContract = {
  id: 'database-agent',
  version: '1.0.0',
  role: 'Database Agent',
  objective:
    'Projetar e implementar mudanças de schema, RLS, RPCs e migrações com segurança, reversibilidade e evidências verificáveis.',
  enabled: true,
  capabilities: [
    'repo.read',
    'repo.search',
    'repo.write',
    'database.inspect',
    'database.schema.plan',
    'database.migration.write',
    'database.rls.review',
    'tests.plan',
    'tests.execute',
    'evidence.collect',
    'database.migrate.production',
  ],
  skillIds: ['repository-engineering', 'database-engineering', 'quality-assurance', 'evidence-governance'],
  deniedCapabilities: ['database.migrate.production'],
  humanApprovalFor: ['privileged', 'destructive'],
  maxSteps: 30,
};
