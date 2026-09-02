import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApprovalLedger } from '../../scripts/engineering-os/approval-ledger.mjs';
import { createAuditLedger } from '../../scripts/engineering-os/audit-ledger.mjs';
import { createCheckpointStore } from '../../scripts/engineering-os/checkpoint-store.mjs';
import { createLockManager } from '../../scripts/engineering-os/lock-manager.mjs';
import { createToolBroker } from '../../scripts/engineering-os/tool-broker.mjs';
import { createRun } from '../../scripts/engineering-os/runtime.mjs';

const tempDirs: string[] = [];
const tempDir = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-os-'));
  tempDirs.push(directory);
  return directory;
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of tempDirs.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Engineering OS governed execution', () => {
  it('replays idempotent repository writes without executing the adapter twice', async () => {
    const adapter = vi.fn(async ({ input }) => ({ written: input.path }));
    const broker = createToolBroker({ adapters: { 'repository.write-source': adapter } });
    const request = {
      runId: 'run-1',
      agentId: 'frontend-engineer',
      toolId: 'repository.write-source',
      operation: 'write-source',
      input: { path: 'src/example.ts' },
      resource: 'src/example.ts',
      idempotencyKey: 'run-1:src/example.ts:v1'
    };

    const first = await broker.execute(request);
    const replay = await broker.execute(request);

    expect(first.ok).toBe(true);
    expect(replay.replayed).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(broker.audit.verify().valid).toBe(true);
  });

  it('requires independent approval for high-risk governed writes and consumes it once', async () => {
    const audit = createAuditLedger();
    const approvals = createApprovalLedger({ audit });
    const broker = createToolBroker({
      audit,
      approvals,
      adapters: { 'repository.write-ci': async () => ({ changed: true }) }
    });
    const approval = approvals.request({
      runId: 'run-2',
      requestedBy: 'quality-engineer',
      scope: 'ci-write',
      operation: 'edit-workflow',
      toolId: 'repository.write-ci',
      risk: 'high',
      reason: 'Harden CI gate'
    });

    expect(() => approvals.decide({ approvalId: approval.id, actor: 'quality-engineer', decision: 'approved', reason: 'self approve' }))
      .toThrow(/independent approver/);
    approvals.decide({ approvalId: approval.id, actor: 'reviewer', decision: 'approved', reason: 'Reviewed workflow change' });

    const result = await broker.execute({
      runId: 'run-2',
      agentId: 'quality-engineer',
      toolId: 'repository.write-ci',
      operation: 'edit-workflow',
      input: { file: '.github/workflows/quality.yml' },
      resource: '.github/workflows/quality.yml',
      approvalId: approval.id,
      idempotencyKey: 'run-2:quality-workflow:v1'
    });

    expect(result.ok).toBe(true);
    expect(approvals.get(approval.id).status).toBe('consumed');
  });

  it('fails closed for production deployment even with an approval when the agent lacks production-write scope', async () => {
    const audit = createAuditLedger();
    const approvals = createApprovalLedger({ audit });
    const broker = createToolBroker({
      audit,
      approvals,
      adapters: { 'production.deploy': async () => ({ deployed: true }) }
    });
    const approval = approvals.request({
      runId: 'run-3',
      requestedBy: 'release-engineer',
      scope: 'production-write',
      operation: 'production-deploy',
      toolId: 'production.deploy',
      risk: 'critical',
      reason: 'Production release'
    });
    approvals.decide({ approvalId: approval.id, actor: 'reviewer', decision: 'approved', reason: 'Release reviewed' });

    await expect(broker.execute({
      runId: 'run-3',
      agentId: 'release-engineer',
      toolId: 'production.deploy',
      operation: 'production-deploy',
      resource: 'production',
      approvalId: approval.id
    })).rejects.toThrow(/scope-not-allowed/);
  });

  it('enforces exclusive resource locks', () => {
    const locks = createLockManager();
    const first = locks.acquire({ resource: 'src/App.tsx', owner: 'run-a' });
    expect(() => locks.acquire({ resource: 'src/App.tsx', owner: 'run-b' })).toThrow(/Resource locked/);
    expect(locks.release({ resource: 'src/App.tsx', token: first.token })).toBe(true);
    expect(locks.acquire({ resource: 'src/App.tsx', owner: 'run-b' }).owner).toBe('run-b');
  });

  it('detects checkpoint tampering before recovery', () => {
    const directory = tempDir();
    const checkpoints = createCheckpointStore({ directory });
    const run = createRun({ workflowId: 'brownfield' });
    const saved = checkpoints.save({ run, checkpointId: 'before-change', actor: 'orchestrator', reason: 'Safe restore point' });
    expect(checkpoints.load({ runId: run.id, checkpointId: 'before-change' }).checkpointFingerprint).toBe(saved.checkpointFingerprint);

    const file = path.join(directory, `${run.id}.before-change.json`);
    const corrupted = JSON.parse(fs.readFileSync(file, 'utf8'));
    corrupted.run.status = 'completed';
    fs.writeFileSync(file, JSON.stringify(corrupted), 'utf8');

    expect(() => checkpoints.load({ runId: run.id, checkpointId: 'before-change' })).toThrow(/corrupted/);
  });
});
