import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentHandlerRegistry } from '../../scripts/engineering-os/agent-handlers.mjs';
import { createExecutionAdapters } from '../../scripts/engineering-os/execution-adapters.mjs';
import { createLeaseStore } from '../../scripts/engineering-os/lease-store.mjs';
import { createRecoveryManager } from '../../scripts/engineering-os/recovery-manager.mjs';
import { createToolBroker } from '../../scripts/engineering-os/tool-broker.mjs';
import { createRun, transitionRun } from '../../scripts/engineering-os/runtime.mjs';
import { RunStateStore } from '../../scripts/engineering-os/state-store.mjs';

const tempDirs: string[] = [];
const tempDir = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-os-ops-'));
  tempDirs.push(directory);
  return directory;
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of tempDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Engineering OS operational runtime', () => {
  it('prevents repository adapters from escaping their path class', async () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    const adapters = createExecutionAdapters({ workspaceRoot: root });

    await expect(adapters['repository.write-source']({ input: { path: '.github/workflows/pwn.yml', content: 'x' } }))
      .rejects.toThrow(/outside allowed paths/);
    await expect(adapters['database.write-migration']({ input: { path: 'src/not-a-migration.sql', content: 'select 1;' } }))
      .rejects.toThrow(/outside allowed paths/);
    await expect(adapters['repository.write-source']({ input: { path: '../escape.ts', content: 'x' } }))
      .rejects.toThrow(/escapes workspace/);
  });

  it('only executes quality commands from the fixed allowlist', async () => {
    const root = tempDir();
    const commandRunner = vi.fn(async () => ({ code: 0, signal: null, stdout: 'ok', stderr: '' }));
    const adapters = createExecutionAdapters({ workspaceRoot: root, commandRunner });

    await expect(adapters['quality.execute']({ input: { command: 'rm -rf /' } })).rejects.toThrow(/not allowed/);
    const result = await adapters['quality.execute']({ input: { command: 'typecheck' } });
    expect(result.passed).toBe(true);
    expect(commandRunner).toHaveBeenCalledWith(expect.objectContaining({ command: 'npm', args: ['run', 'typecheck'] }));
  });

  it('persists exclusive leases and rejects a second owner', () => {
    const directory = tempDir();
    const leases = createLeaseStore({ directory });
    const first = leases.acquire({ resource: 'run:abc', owner: 'worker-a' });
    expect(() => leases.acquire({ resource: 'run:abc', owner: 'worker-b' })).toThrow(/already held/);
    expect(leases.release({ resource: 'run:abc', owner: 'worker-a', token: first.token })).toBe(true);
    expect(leases.acquire({ resource: 'run:abc', owner: 'worker-b' }).owner).toBe('worker-b');
  });

  it('does not let an agent strategy bypass its skill tool allowlist', async () => {
    const broker = createToolBroker({ adapters: { 'quality.execute': async () => ({ passed: true }) } });
    const registry = createAgentHandlerRegistry({ broker });
    const handler = registry.register({
      agentId: 'frontend-engineer',
      skillId: 'implementation',
      strategy: async ({ callTool }) => {
        await callTool({ toolId: 'quality.execute', operation: 'quality', input: { command: 'test' } });
        return { output: null, evidence: [] };
      }
    });

    await expect(handler({
      run: { id: 'run-skill', workflowId: 'brownfield', metadata: {} },
      step: { agentId: 'frontend-engineer', stepId: 'implementation', gates: [] }
    })).rejects.toThrow(/Tool not allowed by skill/);
  });

  it('recovers interrupted running work into a resumable blocked state', () => {
    const directory = tempDir();
    const stateStore = new RunStateStore(path.join(directory, 'state'));
    let run = createRun({ workflowId: 'brownfield', risk: 'high' });
    run = transitionRun(run, 'planned', 'planned');
    run = transitionRun(run, 'running', 'started');
    run = {
      ...run,
      steps: {
        inventory: { required: true, status: 'running', agentId: 'repo-archaeologist', startedAt: new Date().toISOString() }
      }
    };
    stateStore.write(run);

    const recovery = createRecoveryManager({ stateStore });
    const result = recovery.recoverInterrupted({ runId: run.id });
    expect(result.recovered).toBe(true);
    expect(result.run.status).toBe('blocked');
    expect(result.run.steps.inventory.status).toBe('blocked');
    expect(stateStore.read(run.id)?.steps.inventory.status).toBe('blocked');
  });
});
