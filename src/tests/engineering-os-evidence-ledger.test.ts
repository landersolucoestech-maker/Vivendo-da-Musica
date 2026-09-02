import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEvidenceLedger } from '../../scripts/engineering-os/evidence-ledger.mjs';

const directories: string[] = [];
const makeDirectory = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-os-evidence-'));
  directories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Engineering OS evidence ledger', () => {
  it('persists and verifies an append-only evidence chain', () => {
    const directory = makeDirectory();
    const filePath = path.join(directory, 'evidence.jsonl');
    const ledger = createEvidenceLedger({ filePath });

    ledger.append({
      runId: 'run-evidence-1',
      agentId: 'test-engineer',
      evidence: { kind: 'test', source: 'vitest', result: 'passed', timestamp: new Date().toISOString() }
    });
    ledger.append({
      runId: 'run-evidence-1',
      agentId: 'quality-engineer',
      evidence: { kind: 'workflow', source: 'github-actions', result: 'success', timestamp: new Date().toISOString() }
    });

    expect(ledger.verify()).toMatchObject({ valid: true, records: 2 });
    expect(createEvidenceLedger({ filePath }).list({ runId: 'run-evidence-1' })).toHaveLength(2);
  });

  it('rejects claim-only evidence', () => {
    const ledger = createEvidenceLedger();
    expect(() => ledger.append({
      runId: 'run-evidence-2',
      agentId: 'reviewer',
      evidence: { kind: 'manual-verification', source: 'reviewer', result: 'claim-only', timestamp: new Date().toISOString() }
    })).toThrow(/Claim-only evidence is forbidden/);
  });

  it('detects tampering when a persisted evidence record is edited', () => {
    const directory = makeDirectory();
    const filePath = path.join(directory, 'evidence.jsonl');
    const ledger = createEvidenceLedger({ filePath });
    ledger.append({
      runId: 'run-evidence-3',
      agentId: 'test-engineer',
      evidence: { kind: 'test', source: 'vitest', result: 'passed', timestamp: new Date().toISOString() }
    });

    const record = JSON.parse(fs.readFileSync(filePath, 'utf8').trim());
    record.evidence.result = 'failed';
    fs.writeFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');

    expect(() => createEvidenceLedger({ filePath })).toThrow(/integrity check failed/);
  });
});
