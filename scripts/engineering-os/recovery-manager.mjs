import { fingerprint } from './runtime.mjs';

const nowIso = () => new Date().toISOString();
const terminal = new Set(['completed', 'failed', 'cancelled']);

export const createRecoveryManager = ({ stateStore, checkpointStore = null, leaseStore = null, audit = null } = {}) => {
  if (!stateStore) throw new Error('Recovery manager requires a state store');

  const recoverInterrupted = ({ runId, actor = 'recovery-engineer', reason = 'executor-interrupted' }) => {
    let run = stateStore.read(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    if (terminal.has(run.status)) throw new Error(`Terminal run cannot be recovered: ${run.status}`);
    const previousFingerprint = fingerprint(run);
    const interrupted = Object.entries(run.steps ?? {}).filter(([, step]) => step.status === 'running');
    if (interrupted.length === 0 && run.status !== 'running') {
      return { recovered: false, reason: 'no-interrupted-work', run: structuredClone(run) };
    }

    const timestamp = nowIso();
    const steps = { ...run.steps };
    for (const [stepId, step] of interrupted) {
      steps[stepId] = {
        ...step,
        status: 'blocked',
        reason,
        interruptedAt: timestamp,
        updatedAt: timestamp
      };
    }
    run = {
      ...run,
      status: 'blocked',
      steps,
      updatedAt: timestamp,
      events: [
        ...(run.events ?? []),
        { type: 'recovery', from: run.status, to: 'blocked', reason, timestamp, actor }
      ]
    };
    stateStore.write(run, previousFingerprint);
    audit?.append({
      type: 'run.recovered-interruption',
      actor,
      runId,
      payload: { reason, interruptedStepIds: interrupted.map(([stepId]) => stepId) }
    });
    return { recovered: true, interruptedStepIds: interrupted.map(([stepId]) => stepId), run: structuredClone(run) };
  };

  const restoreCheckpoint = ({ runId, checkpointId, actor = 'recovery-engineer', reason }) => {
    if (!checkpointStore) throw new Error('Checkpoint store is not configured');
    if (!reason) throw new Error('Checkpoint restore requires a reason');
    const current = stateStore.read(runId);
    if (!current) throw new Error(`Run not found: ${runId}`);
    if (terminal.has(current.status)) throw new Error(`Terminal run cannot be restored: ${current.status}`);
    const currentFingerprint = fingerprint(current);
    const checkpoint = checkpointStore.load({ runId, checkpointId });
    const restoredAt = nowIso();
    const restored = {
      ...checkpoint.run,
      status: 'blocked',
      updatedAt: restoredAt,
      metadata: {
        ...(checkpoint.run.metadata ?? {}),
        recovery: { checkpointId, reason, actor, restoredAt, replacedFingerprint: currentFingerprint }
      },
      events: [
        ...(checkpoint.run.events ?? []),
        { type: 'checkpoint-restored', from: current.status, to: 'blocked', reason, timestamp: restoredAt, actor, checkpointId }
      ]
    };
    stateStore.write(restored, currentFingerprint);
    audit?.append({
      type: 'run.checkpoint-restored',
      actor,
      runId,
      payload: { checkpointId, reason, replacedFingerprint: currentFingerprint, restoredFingerprint: fingerprint(restored) }
    });
    return { restored: true, checkpointId, run: structuredClone(restored) };
  };

  const withRecoveryLease = async ({ runId, owner, ttlMs = 60000 }, operation) => {
    if (!leaseStore) return operation();
    const resource = `run:${runId}:recovery`;
    const lease = leaseStore.acquire({ resource, owner, ttlMs });
    try {
      return await operation();
    } finally {
      leaseStore.release({ resource, owner, token: lease.token });
    }
  };

  return { recoverInterrupted, restoreCheckpoint, withRecoveryLease };
};
