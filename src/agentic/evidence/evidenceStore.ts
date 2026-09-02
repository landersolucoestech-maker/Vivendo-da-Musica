import { evidenceRecordSchema, type EvidenceRecord, type EvidenceRecordInput } from '@/agentic/contracts/evidenceContract';

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
  return `{${entries.join(',')}}`;
};

const deterministicHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const freezeRecord = (record: EvidenceRecord): EvidenceRecord => Object.freeze({
  ...record,
  payload: Object.freeze({ ...record.payload }),
});

export interface EvidenceCheckpoint {
  version: 1;
  recordCount: number;
  headHash: string | null;
  records: readonly EvidenceRecord[];
}

const freezeCheckpoint = (checkpoint: EvidenceCheckpoint): Readonly<EvidenceCheckpoint> => Object.freeze({
  ...checkpoint,
  records: Object.freeze([...checkpoint.records]),
});

export class EvidenceStore {
  private readonly records: EvidenceRecord[] = [];
  private readonly ids = new Set<string>();

  append(input: EvidenceRecordInput): EvidenceRecord {
    if (this.ids.has(input.id)) throw new Error(`Evidence id duplicado: ${input.id}`);

    const previous = this.records.at(-1) ?? null;
    const sequence = this.records.length;
    const previousHash = previous?.hash ?? null;
    const hash = deterministicHash(stableSerialize({ ...input, sequence, previousHash }));
    const record = evidenceRecordSchema.parse({ ...input, sequence, previousHash, hash });
    const frozen = freezeRecord(record);
    this.records.push(frozen);
    this.ids.add(frozen.id);
    return frozen;
  }

  all(): readonly EvidenceRecord[] {
    return Object.freeze([...this.records]);
  }

  byCorrelationId(correlationId: string): readonly EvidenceRecord[] {
    return Object.freeze(this.records.filter((record) => record.correlationId === correlationId));
  }

  checkpoint(): Readonly<EvidenceCheckpoint> {
    return freezeCheckpoint({
      version: 1,
      recordCount: this.records.length,
      headHash: this.records.at(-1)?.hash ?? null,
      records: this.all(),
    });
  }

  static restore(checkpoint: EvidenceCheckpoint): EvidenceStore {
    if (checkpoint.version !== 1) {
      throw new Error(`Versão de EvidenceCheckpoint não suportada: ${String(checkpoint.version)}`);
    }
    if (!Number.isInteger(checkpoint.recordCount) || checkpoint.recordCount < 0) {
      throw new Error('EvidenceCheckpoint com recordCount inválido.');
    }
    if (checkpoint.recordCount !== checkpoint.records.length) {
      throw new Error('EvidenceCheckpoint com recordCount divergente dos records.');
    }

    const store = new EvidenceStore();
    for (const rawRecord of checkpoint.records) {
      const record = evidenceRecordSchema.parse(rawRecord);
      if (store.ids.has(record.id)) throw new Error(`EvidenceCheckpoint contém id duplicado: ${record.id}`);
      const frozen = freezeRecord(record);
      store.records.push(frozen);
      store.ids.add(frozen.id);
    }

    const expectedHead = store.records.at(-1)?.hash ?? null;
    if (checkpoint.headHash !== expectedHead) {
      throw new Error('EvidenceCheckpoint com headHash divergente.');
    }
    if (!store.verifyIntegrity()) {
      throw new Error('EvidenceCheckpoint falhou na verificação da cadeia de integridade.');
    }
    return store;
  }

  verifyIntegrity(): boolean {
    let previousHash: string | null = null;
    const seenIds = new Set<string>();
    for (let sequence = 0; sequence < this.records.length; sequence += 1) {
      const record = this.records[sequence];
      if (seenIds.has(record.id)) return false;
      seenIds.add(record.id);

      const expectedHash = deterministicHash(stableSerialize({
        id: record.id,
        correlationId: record.correlationId,
        workflowId: record.workflowId,
        agentId: record.agentId,
        kind: record.kind,
        occurredAt: record.occurredAt,
        payload: record.payload,
        sequence,
        previousHash,
      }));
      if (record.sequence !== sequence || record.previousHash !== previousHash || record.hash !== expectedHash) {
        return false;
      }
      previousHash = record.hash;
    }
    return true;
  }
}
