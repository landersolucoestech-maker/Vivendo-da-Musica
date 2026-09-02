export type IdempotencyState = 'started' | 'completed' | 'failed';

export interface IdempotencyRecord<Result = unknown> {
  key: string;
  state: IdempotencyState;
  startedAt: string;
  completedAt: string | null;
  result: Result | null;
  error: string | null;
}

export class IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  start(key: string, occurredAt = new Date().toISOString()): Readonly<IdempotencyRecord> {
    if (!key.trim()) throw new Error('Idempotency key obrigatória.');
    const existing = this.records.get(key);
    if (existing) throw new Error(`Operação já registrada para idempotency key: ${key}`);

    const record: IdempotencyRecord = {
      key,
      state: 'started',
      startedAt: occurredAt,
      completedAt: null,
      result: null,
      error: null,
    };
    this.records.set(key, record);
    return Object.freeze({ ...record });
  }

  complete<Result>(key: string, result: Result, occurredAt = new Date().toISOString()): Readonly<IdempotencyRecord<Result>> {
    const current = this.records.get(key);
    if (!current) throw new Error(`Idempotency key não iniciada: ${key}`);
    if (current.state !== 'started') throw new Error(`Idempotency key já finalizada: ${key}`);

    const completed: IdempotencyRecord<Result> = {
      ...current,
      state: 'completed',
      completedAt: occurredAt,
      result,
      error: null,
    };
    this.records.set(key, completed);
    return Object.freeze({ ...completed });
  }

  fail(key: string, error: string, occurredAt = new Date().toISOString()): Readonly<IdempotencyRecord> {
    const current = this.records.get(key);
    if (!current) throw new Error(`Idempotency key não iniciada: ${key}`);
    if (current.state !== 'started') throw new Error(`Idempotency key já finalizada: ${key}`);

    const failed: IdempotencyRecord = {
      ...current,
      state: 'failed',
      completedAt: occurredAt,
      result: null,
      error: error.trim() || 'Falha não especificada.',
    };
    this.records.set(key, failed);
    return Object.freeze({ ...failed });
  }

  get(key: string): Readonly<IdempotencyRecord> | null {
    const record = this.records.get(key);
    return record ? Object.freeze({ ...record }) : null;
  }
}
