import { describe, expect, it } from 'vitest';

import { createDefaultPolicyEngine } from '@/agentic/policy/defaultPolicySet';

describe('default agentic policies', () => {
  it('requires human approval for authorization hardening even at write risk', () => {
    const engine = createDefaultPolicyEngine();

    const denied = engine.evaluate({
      agentId: 'database-agent',
      capability: 'authorization.harden',
      risk: 'write',
      approvedByHuman: false,
    });

    expect(denied.allowed).toBe(false);
    expect(denied.effect).toBe('require_approval');
    expect(denied.matchedRuleIds).toContain('authorization.harden.require-human');

    const approved = engine.evaluate({
      agentId: 'database-agent',
      capability: 'authorization.harden',
      risk: 'write',
      approvedByHuman: true,
    });

    expect(approved.allowed).toBe(true);
    expect(approved.effect).toBe('require_approval');
  });
});
