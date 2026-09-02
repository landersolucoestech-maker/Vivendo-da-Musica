import type { AgentRisk } from '@/agentic/contracts/agentContract';

export type PolicyEffect = 'allow' | 'require_approval' | 'deny';

export interface PolicyRule {
  id: string;
  effect: PolicyEffect;
  agentId?: string;
  capability?: string;
  risks?: AgentRisk[];
  reason: string;
}

export interface PolicyContext {
  agentId: string;
  capability: string;
  risk: AgentRisk;
  approvedByHuman: boolean;
}

export interface PolicyDecision {
  effect: PolicyEffect;
  allowed: boolean;
  requiresApproval: boolean;
  reasons: string[];
  matchedRuleIds: string[];
}

const priority: Record<PolicyEffect, number> = {
  allow: 1,
  require_approval: 2,
  deny: 3,
};

const matches = (rule: PolicyRule, context: PolicyContext): boolean => {
  if (rule.agentId && rule.agentId !== context.agentId) return false;
  if (rule.capability && rule.capability !== context.capability) return false;
  if (rule.risks && !rule.risks.includes(context.risk)) return false;
  return true;
};

export class PolicyEngine {
  constructor(private readonly rules: readonly PolicyRule[]) {}

  evaluate(context: PolicyContext): PolicyDecision {
    const matched = this.rules.filter((rule) => matches(rule, context));
    if (matched.length === 0) {
      return {
        effect: 'deny',
        allowed: false,
        requiresApproval: false,
        reasons: ['Nenhuma policy autorizou esta operação.'],
        matchedRuleIds: [],
      };
    }

    const winningEffect = matched.reduce<PolicyEffect>((current, rule) =>
      priority[rule.effect] > priority[current] ? rule.effect : current,
    'allow');

    const winners = matched.filter((rule) => rule.effect === winningEffect);
    if (winningEffect === 'deny') {
      return {
        effect: 'deny',
        allowed: false,
        requiresApproval: false,
        reasons: winners.map((rule) => rule.reason),
        matchedRuleIds: winners.map((rule) => rule.id),
      };
    }

    if (winningEffect === 'require_approval') {
      return {
        effect: 'require_approval',
        allowed: context.approvedByHuman,
        requiresApproval: true,
        reasons: winners.map((rule) => rule.reason),
        matchedRuleIds: winners.map((rule) => rule.id),
      };
    }

    return {
      effect: 'allow',
      allowed: true,
      requiresApproval: false,
      reasons: winners.map((rule) => rule.reason),
      matchedRuleIds: winners.map((rule) => rule.id),
    };
  }
}
