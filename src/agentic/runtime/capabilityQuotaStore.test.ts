import { describe, expect, it } from 'vitest';

import { CapabilityQuotaStore } from '@/agentic/runtime/capabilityQuotaStore';

describe('CapabilityQuotaStore', () => {
  it('enforces an agent/capability quota inside the configured window', () => {
    const store = new CapabilityQuotaStore([
      { agentId: 'release-agent', capability: 'deploy.production', maxExecutions: 2, windowMs: 60_000 },
    ]);
    const context = { agentId: 'release-agent', capability: 'deploy.production' };
    const start = new Date('2026-09-02T06:00:00.000Z');

    expect(store.assertAndConsume(context, start)?.remaining).toBe(1);
    expect(store.assertAndConsume(context, new Date(start.getTime() + 1_000))?.remaining).toBe(0);
    expect(() => store.assertAndConsume(context, new Date(start.getTime() + 2_000))).toThrow('Quota da capability excedida');
  });

  it('opens a fresh quota window after expiration', () => {
    const store = new CapabilityQuotaStore([
      { agentId: '*', capability: 'repo.write', maxExecutions: 1, windowMs: 10_000 },
    ]);
    const context = { agentId: 'frontend-agent', capability: 'repo.write' };
    const start = new Date('2026-09-02T06:00:00.000Z');

    store.assertAndConsume(context, start);
    expect(() => store.assertAndConsume(context, new Date(start.getTime() + 9_999))).toThrow('Quota da capability excedida');
    expect(store.assertAndConsume(context, new Date(start.getTime() + 10_000))?.used).toBe(1);
  });

  it('prefers an exact agent quota over a wildcard quota', () => {
    const store = new CapabilityQuotaStore([
      { agentId: '*', capability: 'deploy.production', maxExecutions: 5, windowMs: 60_000 },
      { agentId: 'release-agent', capability: 'deploy.production', maxExecutions: 1, windowMs: 60_000 },
    ]);
    const context = { agentId: 'release-agent', capability: 'deploy.production' };

    store.assertAndConsume(context, new Date('2026-09-02T06:00:00.000Z'));
    expect(() => store.assertAndConsume(context, new Date('2026-09-02T06:00:01.000Z'))).toThrow('Quota da capability excedida');
  });
});
