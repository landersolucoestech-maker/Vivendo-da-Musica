import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint, runtimePolicy } from './runtime.mjs';
import { sealRecord, verifyRecord } from './integrity.mjs';

const GENESIS = '0'.repeat(64);

export const createEvidenceLedger = ({ filePath = null, audit = null } = {}) => {
  let records = [];
  if (filePath && fs.existsSync(filePath)) {
    records = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  }

  const verify = () => {
    let previousFingerprint = GENESIS;
    records.forEach((record, index) => {
      verifyRecord(record, `Evidence record ${index + 1}`);
      if (record.sequence !== index + 1) throw new Error(`Evidence sequence mismatch: ${index + 1}`);
      if (record.previousFingerprint !== previousFingerprint) throw new Error(`Evidence chain broken: ${record.id}`);
      previousFingerprint = record.fingerprint;
    });
    return { valid: true, records: records.length, head: previousFingerprint };
  };

  verify();

  const persist = (record) => {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');
  };

  return {
    append({ runId, agentId, evidence }) {
      if (!runId || !agentId) throw new Error('Evidence record requires runId and agentId');
      for (const field of runtimePolicy.evidence.minimumFields) {
        if (!evidence?.[field]) throw new Error(`Evidence missing field: ${field}`);
      }
      if (!runtimePolicy.evidence.allowedKinds.includes(evidence.kind)) throw new Error(`Unsupported evidence kind: ${evidence.kind}`);
      if (runtimePolicy.completion.forbidClaimOnlyEvidence && evidence.result === 'claim-only') throw new Error('Claim-only evidence is forbidden');

      const record = sealRecord({
        id: crypto.randomUUID(),
        sequence: records.length + 1,
        runId,
        agentId,
        recordedAt: new Date().toISOString(),
        previousFingerprint: records.at(-1)?.fingerprint ?? GENESIS,
        evidence: structuredClone(evidence),
        evidenceFingerprint: fingerprint(evidence)
      });
      records = [...records, record];
      persist(record);
      audit?.append({ type: 'evidence.recorded', actor: agentId, runId, payload: { evidenceId: record.id, kind: evidence.kind, evidenceFingerprint: record.evidenceFingerprint } });
      return structuredClone(record);
    },

    list({ runId = null } = {}) {
      verify();
      return records.filter((record) => !runId || record.runId === runId).map((record) => structuredClone(record));
    },

    verify,

    digest() {
      const state = verify();
      return crypto.createHash('sha256').update(`${state.records}:${state.head}`).digest('hex');
    }
  };
};
