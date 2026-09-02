import { PolicyEngine, type PolicyRule } from '@/agentic/policy/policyEngine';

export const defaultAgenticPolicyRules: readonly PolicyRule[] = Object.freeze([
  {
    id: 'risk.read.allow',
    effect: 'allow',
    risks: ['read'],
    reason: 'Operações de leitura são permitidas quando o contrato do agente e o adapter também autorizam.',
  },
  {
    id: 'risk.write.allow',
    effect: 'allow',
    risks: ['write'],
    reason: 'Operações de escrita são permitidas somente após gates contratuais e lease de execução.',
  },
  {
    id: 'authorization.harden.require-human',
    effect: 'require_approval',
    capability: 'authorization.harden',
    risks: ['write', 'privileged'],
    reason: 'Mudanças no boundary de autorização exigem aprovação humana explícita, mesmo quando classificadas como write.',
  },
  {
    id: 'risk.privileged.require-human',
    effect: 'require_approval',
    risks: ['privileged'],
    reason: 'Operações privilegiadas exigem aprovação humana explícita e receipt válida.',
  },
  {
    id: 'risk.destructive.require-human',
    effect: 'require_approval',
    risks: ['destructive'],
    reason: 'Operações destrutivas exigem aprovação humana explícita e receipt válida.',
  },
]);

export const createDefaultPolicyEngine = (): PolicyEngine => new PolicyEngine(defaultAgenticPolicyRules);
