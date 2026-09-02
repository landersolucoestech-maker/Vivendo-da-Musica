import { describe, expect, it } from 'vitest';

import { IdempotencyStore } from './idempotencyStore';

describe('IdempotencyStore', () => {
  it('prevents duplicate starts for the same key', () => {
    const store = new IdempotencyStore();
    store.start('op-1', '2026-09-02T05:00:00.000Z');
    expect(() => store.start('op-1', '2026-09-02T05:00:01.000Z')).toThrow(
      'Operação já registrada para idempotency key: op-1',
    );
  });

  it('allows a started operation to complete only once', () => {
    const store = new IdempotencyStore();
    store.start('op-2', '2026-09-02T05:00:00.000Z');
    const completed = store.complete('op-2', { commitSha: 'abc' }, '2026-09-02T05:00:02.000Z');
    expect(completed.state).toBe('completed');
    expect(completed.result).toEqual({ commitSha: 'abc' });
    expect(() => store.complete('op-2', { commitSha: 'def' })).toThrow(
      'Idempotency key já finalizada: op-2',
    );
  });

  it('records terminal failures without permitting silent retries', () => {
    const store = new IdempotencyStore();
    store.start('op-3');
    expect(store.fail('op-3', 'timeout').state).toBe('failed');
    expect(() => store.start('op-3')).toThrow('Operação já registrada para idempotency key: op-3');
  });
});
