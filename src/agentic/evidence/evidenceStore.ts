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

export class EvidenceStore {
  private readonly records: EvidenceRecord[] = [];

  append(input: EvidenceRecordInput): EvidenceRecord {
    const previous = this.records.at(-1) ?? null;
    const sequence = this.records.length;
    const previousHash = previous?.hash ?? null;
    const hash = deterministicHash(stableSerialize({ ...input, sequence, previousHash }));
    const record = evidenceRecordSchema.parse({ ...input, sequence, previousHash, hash });
    const frozen = freezeRecord(record);
    this.records.push(frozen);
    return frozen;
  }

  all(): readonly EvidenceRecord[] {
    return Object.freeze([...this.records]);
  }

  byCorrelationId(correlationId: string): readonly EvidenceRecord[] {
    return Object.freeze(this.records.filter((record) => record.correlationId === correlationId));
  }

  verifyIntegrity(): boolean {
    let previousHash: string | null = null;
    for (let sequence = 0; sequence < this.records.length; sequence += 1) {
      const record = this.records[sequence];
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
