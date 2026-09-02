import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEngineeringKernel } from '../../scripts/engineering-os/kernel.mjs';

const directories: string[] = [];
const tempDir = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-os-kernel-'));
  directories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Engineering OS kernel', () => {
  it('executes the first brownfield step through workflow, skill, broker, evidence and state persistence', async () => {
    const workspaceRoot = tempDir();
    const runtimeDirectory = tempDir();
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), '{"name":"fixture"}\n', 'utf8');

    const kernel = createEngineeringKernel({ workspaceRoot, runtimeDirectory, workerId: 'test-worker' });
    const run = kernel.initialize({
      workflowId: 'brownfield',
      metadata: { inventoryPaths: ['package.json'] },
    });
    const result = await kernel.executeNext({ runId: run.id });

    expect(result.type).toBe('completed-step');
    expect(result.step.agentId).toBe('repo-archaeologist');
    expect(result.step.skillId).toBe('repository-inventory');
    expect(result.run.gates['inventory-evidence'].status).toBe('passed');
    const evidenceId = result.run.gates['inventory-evidence'].evidenceIds[0];
    const observed = result.run.evidence.find((item) => item.id === evidenceId);
    expect(observed).toMatchObject({
      producerAgentId: 'repo-archaeologist',
      producerSkillId: 'repository-inventory',
      producerStepId: 'inventory',
    });
    expect(kernel.stateStore.read(run.id)?.steps.inventory.status).toBe('completed');
    expect(kernel.audit.verify().valid).toBe(true);
  });
});
