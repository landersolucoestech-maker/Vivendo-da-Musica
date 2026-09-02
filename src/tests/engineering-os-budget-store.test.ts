import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createBudgetStore } from '../../scripts/engineering-os/budget-store.mjs';
import { createToolBroker } from '../../scripts/engineering-os/tool-broker.mjs';

const directories: string[] = [];
const tempDir = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-os-budget-'));
  directories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Engineering OS persistent budgets', () => {
  it('does not reset a run call budget when the broker process is recreated', async () => {
    const directory = tempDir();
    const budgetStore = createBudgetStore({ directory });
    const adapters = { 'repository.read': async () => ({ observed: true }) };
    const firstBroker = createToolBroker({ adapters, budgetStore, maxCalls: 1 });

    await expect(firstBroker.execute({
      runId: 'persistent-run',
      agentId: 'repo-archaeologist',
      toolId: 'repository.read',
      operation: 'inventory-read',
      input: { path: 'package.json' }
    })).resolves.toMatchObject({ ok: true });

    expect(firstBroker.getBudget('persistent-run')?.calls).toBe(1);

    const restartedBroker = createToolBroker({ adapters, budgetStore, maxCalls: 1 });
    await expect(restartedBroker.execute({
      runId: 'persistent-run',
      agentId: 'repo-archaeologist',
      toolId: 'repository.read',
      operation: 'inventory-read',
      input: { path: 'package.json' }
    })).rejects.toThrow(/Tool call budget exhausted/);
  });

  it('detects tampering with persisted budget state', () => {
    const directory = tempDir();
    const budgetStore = createBudgetStore({ directory });
    budgetStore.reserve({ runId: 'tamper-run', maxCalls: 5, maxTotalDurationMs: 1000 });

    const file = path.join(directory, 'tamper-run.budget.json');
    const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
    envelope.budget.calls = 0;
    fs.writeFileSync(file, JSON.stringify(envelope), 'utf8');

    expect(() => budgetStore.inspect('tamper-run')).toThrow(/Budget integrity check failed/);
  });
});
