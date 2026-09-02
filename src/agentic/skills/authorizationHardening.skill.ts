import type { SkillContract } from '@/agentic/contracts/skillContract';

export const authorizationHardeningSkill: SkillContract = {
  id: 'authorization-hardening',
  version: '1.0.0',
  name: 'Authorization Hardening',
  objective:
    'Auditar e endurecer autenticação, autorização, RLS, grants e boundaries privilegiados com testes negativos e revisão independente.',
  enabled: true,
  capabilityPrefixes: ['authorization.'],
  allowedRisks: ['read', 'write', 'privileged'],
  requiredEvidence: ['tool_result', 'verification'],
};
