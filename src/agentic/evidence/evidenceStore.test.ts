import { describe, expect, it } from 'vitest';

import { EvidenceStore, type EvidenceCheckpoint } from './evidenceStore';

const appendFixture = (store: EvidenceStore): void => {
  store.append({
    id: 'ev-1',
    correlationId: 'corr-1',
    workflowId: 'wf-1',
    agentId: 'engineering-orchestrator',
    kind: 'request',
    occurredAt: '2026-09-02T05:00:00.000Z',
    payload: { capability: 'repo.read' },
  });
  store.append({
    id: 'ev-2',
    correlationId: 'corr-1',
    workflowId: 'wf-1',
    agentId: 'engineering-orchestrator',
    kind: 'admission',
    occurredAt: '2026-09-02T05:00:01.000Z',
    payload: { allowed: true },
  });
};

describe('EvidenceStore', () => {
  it('creates an ordered hash chain', () => {
    const store = new EvidenceStore();
    appendFixture(store);
    const [first, second] = store.all();

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

  it('restores a verified checkpoint and continues the same hash chain', () => {
    const original = new EvidenceStore();
    appendFixture(original);
    const checkpoint = original.checkpoint();

    const restored = EvidenceStore.restore(checkpoint);
    expect(restored.verifyIntegrity()).toBe(true);
    expect(restored.all()).toEqual(original.all());

    const third = restored.append({
      id: 'ev-3',
      correlationId: 'corr-1',
      workflowId: 'wf-1',
      agentId: 'reviewer-agent',
      kind: 'verification',
      occurredAt: '2026-09-02T05:00:02.000Z',
      payload: { passed: true },
    });
    expect(third.sequence).toBe(2);
    expect(third.previousHash).toBe(checkpoint.headHash);
    expect(restored.verifyIntegrity()).toBe(true);
  });

  it('rejects a checkpoint whose record payload was modified', () => {
    const store = new EvidenceStore();
    appendFixture(store);
    const checkpoint = store.checkpoint();
    const tampered: EvidenceCheckpoint = {
      ...checkpoint,
      records: checkpoint.records.map((record, index) => index === 0
        ? { ...record, payload: { capability: 'repo.write' } }
        : record),
    };

    expect(() => EvidenceStore.restore(tampered)).toThrow('cadeia de integridade');
  });

  it('rejects divergent checkpoint metadata and duplicate evidence ids', () => {
    const store = new EvidenceStore();
    appendFixture(store);
    const checkpoint = store.checkpoint();

    expect(() => EvidenceStore.restore({ ...checkpoint, recordCount: checkpoint.recordCount + 1 }))
      .toThrow('recordCount divergente');
    expect(() => EvidenceStore.restore({ ...checkpoint, headHash: 'fnv1a32:00000000' }))
      .toThrow('headHash divergente');
    expect(() => store.append({
      id: 'ev-1',
      correlationId: 'corr-2',
      workflowId: 'wf-2',
      agentId: 'engineering-orchestrator',
      kind: 'request',
      occurredAt: '2026-09-02T05:00:03.000Z',
      payload: {},
    })).toThrow('Evidence id duplicado');
  });
});
