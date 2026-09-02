import type { AgentRisk } from '@/agentic/contracts/agentContract';

export type IdempotencyState = 'started' | 'completed' | 'failed';

export interface IdempotencyBinding {
  manifestId: string;
  workflowId: string;
  agentId: string;
  capability: string;
  risk: AgentRisk;
  resource: string;
}

export interface IdempotencyRecord<Result = unknown> {
  key: string;
  binding: Readonly<IdempotencyBinding>;
  state: IdempotencyState;
  startedAt: string;
  completedAt: string | null;
  result: Result | null;
  error: string | null;
}

const normalizeBinding = (binding: IdempotencyBinding): IdempotencyBinding => ({
  manifestId: binding.manifestId.trim(),
  workflowId: binding.workflowId.trim(),
  agentId: binding.agentId.trim(),
  capability: binding.capability.trim(),
  risk: binding.risk,
  resource: binding.resource.trim(),
});

const assertCompleteBinding = (binding: IdempotencyBinding): void => {
  const fields: Array<keyof Omit<IdempotencyBinding, 'risk'>> = [
    'manifestId', 'workflowId', 'agentId', 'capability', 'resource',
  ];
  for (const field of fields) {
    if (!binding[field]) throw new Error(`Binding de idempotência incompleto: ${field}.`);
  }
};

const sameBinding = (left: IdempotencyBinding, right: IdempotencyBinding): boolean =>
  left.manifestId === right.manifestId
  && left.workflowId === right.workflowId
  && left.agentId === right.agentId
  && left.capability === right.capability
  && left.risk === right.risk
  && left.resource === right.resource;

const freezeRecord = <Result>(record: IdempotencyRecord<Result>): Readonly<IdempotencyRecord<Result>> => Object.freeze({
  ...record,
  binding: Object.freeze({ ...record.binding }),
});

export class IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  start(
    key: string,
    bindingInput: IdempotencyBinding,
    occurredAt = new Date().toISOString(),
  ): Readonly<IdempotencyRecord> {
    const normalizedKey = key.trim();
    if (!normalizedKey) throw new Error('Idempotency key obrigatória.');
    if (this.records.has(normalizedKey)) throw new Error(`Operação já registrada para idempotency key: ${normalizedKey}`);

    const binding = normalizeBinding(bindingInput);
    assertCompleteBinding(binding);
    const record: IdempotencyRecord = {
      key: normalizedKey,
      binding,
      state: 'started',
      startedAt: occurredAt,
      completedAt: null,
      result: null,
      error: null,
    };
    this.records.set(normalizedKey, record);
    return freezeRecord(record);
  }

  assertBinding(key: string, bindingInput: IdempotencyBinding): Readonly<IdempotencyRecord> | null {
    const normalizedKey = key.trim();
    if (!normalizedKey) throw new Error('Idempotency key obrigatória.');
    const record = this.records.get(normalizedKey);
    if (!record) return null;

    const binding = normalizeBinding(bindingInput);
    assertCompleteBinding(binding);
    if (!sameBinding(record.binding, binding)) {
      throw new Error(`Idempotency key reutilizada com contexto divergente: ${normalizedKey}`);
    }
    return freezeRecord(record);
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
    return freezeRecord(completed);
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
    return freezeRecord(failed);
  }

  get(key: string): Readonly<IdempotencyRecord> | null {
    const record = this.records.get(key);
    return record ? freezeRecord(record) : null;
  }
}
