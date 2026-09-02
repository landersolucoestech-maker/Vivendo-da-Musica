import { describe, expect, it } from 'vitest';

import { EvidenceStore } from './evidenceStore';

describe('EvidenceStore', () => {
  it('creates an ordered hash chain', () => {
    const store = new EvidenceStore();
    const first = store.append({
      id: 'ev-1',
      correlationId: 'corr-1',
      workflowId: 'wf-1',
      agentId: 'engineering-orchestrator',
      kind: 'request',
      occurredAt: '2026-09-02T05:00:00.000Z',
      payload: { capability: 'repo.read' },
    });
    const second = store.append({
      id: 'ev-2',
      correlationId: 'corr-1',
      workflowId: 'wf-1',
      agentId: 'engineering-orchestrator',
      kind: 'admission',
      occurredAt: '2026-09-02T05:00:01.000Z',
      payload: { allowed: true },
    });

    expect(first.sequence).toBe(0);
    expect(second.sequence).toBe(1);
    expect(second.previousHash).toBe(first.hash);
    expect(store.verifyIntegrity()).toBe(true);
  });

  it('returns immutable snapshots instead of the internal collection', () => {
    const store = new EvidenceStore();
    store.append({
      id: 'ev-1',
      correlationId: 'corr-1',
      workflowId: null,
      agentId: 'engineering-orchestrator',
      kind: 'request',
      occurredAt: '2026-09-02T05:00:00.000Z',
      payload: { value: 1 },
    });

    const snapshot = store.all();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0].payload)).toBe(true);
  });
});
