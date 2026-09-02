import type { SkillContract } from '@/agentic/contracts/skillContract';

export const databaseMigrationSafetySkill: SkillContract = {
  id: 'database-migration-safety',
  version: '1.0.0',
  name: 'Database Migration Safety',
  objective:
    'Planejar, preparar e revisar migrations com compatibilidade, reversibilidade, evidência e gates explícitos de produção.',
  enabled: true,
  capabilityPrefixes: ['migration.'],
  allowedRisks: ['read', 'write', 'privileged', 'destructive'],
  requiredEvidence: ['tool_result', 'verification'],
};
