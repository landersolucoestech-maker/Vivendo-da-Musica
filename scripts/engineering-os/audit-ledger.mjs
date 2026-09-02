import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fingerprint } from './runtime.mjs';

const ZERO_HASH = '0'.repeat(64);

export const createAuditLedger = ({ filePath = null } = {}) => {
  let entries = [];

  if (filePath && fs.existsSync(filePath)) {
    entries = fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  const verify = () => {
    let previousHash = ZERO_HASH;
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry.sequence !== index + 1) throw new Error(`Audit sequence mismatch at ${index + 1}`);
      if (entry.previousHash !== previousHash) throw new Error(`Audit chain broken at ${entry.sequence}`);
      const expectedHash = fingerprint({
        sequence: entry.sequence,
        timestamp: entry.timestamp,
        type: entry.type,
        actor: entry.actor,
        runId: entry.runId,
        payload: entry.payload,
        previousHash: entry.previousHash
      });
      if (entry.hash !== expectedHash) throw new Error(`Audit hash mismatch at ${entry.sequence}`);
      previousHash = entry.hash;
    }
    return { valid: true, entries: entries.length, head: previousHash };
  };

  verify();

  const persist = (entry) => {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a' });
  };

  return {
    append({ type, actor, runId = null, payload = {} }) {
      if (!type || !actor) throw new Error('Audit event requires type and actor');
      const previousHash = entries.at(-1)?.hash ?? ZERO_HASH;
      const base = {
        sequence: entries.length + 1,
        timestamp: new Date().toISOString(),
        type,
        actor,
        runId,
        payload,
        previousHash
      };
      const entry = { ...base, hash: fingerprint(base) };
      entries = [...entries, entry];
      persist(entry);
      return entry;
    },
    list() {
      return structuredClone(entries);
    },
    verify,
    digest() {
      const verified = verify();
      return crypto.createHash('sha256').update(`${verified.entries}:${verified.head}`).digest('hex');
    }
  };
};
