import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLeaseStore } from '../../scripts/engineering-os/lease-store.mjs';
import { createLeasedExecutor } from '../../scripts/engineering-os/leased-executor.mjs';

const directories: string[] = [];
const tempDir = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-os-lease-executor-'));
  directories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('leased workflow executor', () => {
  it('prevents concurrent workers from advancing the same run', async () => {
    const leaseStore = createLeaseStore({ directory: tempDir() });
    const executeNext = vi.fn(async () => ({ type: 'completed-step' }));
    const executor = { executeNext, finalize: vi.fn(), initialize: vi.fn(), evidenceLedger: null };
    const leased = createLeasedExecutor({ executor, leaseStore, owner: 'worker-b' });
    const held = leaseStore.acquire({ resource: 'run:run-1:execution', owner: 'worker-a' });

    await expect(leased.executeNext({ runId: 'run-1' })).rejects.toThrow(/Lease already held/);
    expect(executeNext).not.toHaveBeenCalled();
    leaseStore.release({ resource: 'run:run-1:execution', owner: 'worker-a', token: held.token });

    await expect(leased.executeNext({ runId: 'run-1' })).resolves.toEqual({ type: 'completed-step' });
    expect(executeNext).toHaveBeenCalledTimes(1);
  });
});
