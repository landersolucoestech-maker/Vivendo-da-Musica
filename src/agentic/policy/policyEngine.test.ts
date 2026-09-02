import { describe, expect, it } from 'vitest';

import { PolicyEngine } from './policyEngine';

describe('PolicyEngine', () => {
  it('denies by default when no rule matches', () => {
    const engine = new PolicyEngine([]);
    const decision = engine.evaluate({
      agentId: 'engineering-orchestrator',
      capability: 'repo.read',
      risk: 'read',
      approvedByHuman: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.effect).toBe('deny');
  });

  it('requires explicit approval when policy demands it', () => {
    const engine = new PolicyEngine([
      {
        id: 'production-writes-need-approval',
        effect: 'require_approval',
        capability: 'deploy.production',
        reason: 'Deploy de produção exige aprovação humana.',
      },
    ]);

    expect(engine.evaluate({
      agentId: 'release-agent',
      capability: 'deploy.production',
      risk: 'privileged',
      approvedByHuman: false,
    }).allowed).toBe(false);

    expect(engine.evaluate({
      agentId: 'release-agent',
      capability: 'deploy.production',
      risk: 'privileged',
      approvedByHuman: true,
    }).allowed).toBe(true);
  });

  it('keeps deny above approval and allow rules', () => {
    const engine = new PolicyEngine([
      { id: 'allow', effect: 'allow', capability: 'repo.delete', reason: 'Regra permissiva.' },
      { id: 'approval', effect: 'require_approval', capability: 'repo.delete', reason: 'Exige aprovação.' },
      { id: 'deny', effect: 'deny', capability: 'repo.delete', reason: 'Exclusão proibida.' },
    ]);

    const decision = engine.evaluate({
      agentId: 'engineering-orchestrator',
      capability: 'repo.delete',
      risk: 'destructive',
      approvedByHuman: true,
    });

    expect(decision.effect).toBe('deny');
    expect(decision.allowed).toBe(false);
    expect(decision.matchedRuleIds).toEqual(['deny']);
  });
});
