import { describe, expect, it } from 'vitest';

import type { IdempotencyBinding } from './idempotencyStore';
import { IdempotencyStore } from './idempotencyStore';

const binding: IdempotencyBinding = {
  manifestId: 'manifest-1',
  workflowId: 'workflow-1',
  agentId: 'engineering-orchestrator',
  capability: 'repo.read',
  risk: 'read',
  resource: 'repo:path:README.md',
};

describe('IdempotencyStore', () => {
  it('prevents duplicate starts for the same key', () => {
    const store = new IdempotencyStore();
    store.start('op-1', binding, '2026-09-02T05:00:00.000Z');
    expect(() => store.start('op-1', binding, '2026-09-02T05:00:01.000Z')).toThrow(
      'Operação já registrada para idempotency key: op-1',
    );
  });

  it('allows a started operation to complete only once', () => {
    const store = new IdempotencyStore();
    store.start('op-2', binding, '2026-09-02T05:00:00.000Z');
    const completed = store.complete('op-2', { commitSha: 'abc' }, '2026-09-02T05:00:02.000Z');
    expect(completed.state).toBe('completed');
    expect(completed.result).toEqual({ commitSha: 'abc' });
    expect(() => store.complete('op-2', { commitSha: 'def' })).toThrow(
      'Idempotency key já finalizada: op-2',
    );
  });

  it('records terminal failures without permitting silent retries', () => {
    const store = new IdempotencyStore();
    store.start('op-3', binding);
    expect(store.fail('op-3', 'timeout').state).toBe('failed');
    expect(() => store.start('op-3', binding)).toThrow('Operação já registrada para idempotency key: op-3');
  });

  it('rejects reuse of an existing idempotency key with a divergent execution binding', () => {
    const store = new IdempotencyStore();
    store.start('op-4', binding);

    expect(store.assertBinding('op-4', binding)?.state).toBe('started');
    expect(() => store.assertBinding('op-4', {
      ...binding,
      resource: 'repo:path:.env',
    })).toThrow('Idempotency key reutilizada com contexto divergente: op-4');
  });

  it('fails closed when a binding is incomplete', () => {
    const store = new IdempotencyStore();
    expect(() => store.start('op-5', {
      ...binding,
      manifestId: '   ',
    })).toThrow('Binding de idempotência incompleto: manifestId');
  });
});
