import fs from 'node:fs';
import path from 'node:path';
import { fingerprint } from './runtime.mjs';

export const createCheckpointStore = ({ directory }) => {
  if (!directory) throw new Error('Checkpoint directory is required');
  fs.mkdirSync(directory, { recursive: true });

  const checkpointPath = (runId, checkpointId) => path.join(directory, `${runId}.${checkpointId}.json`);

  return {
    save({ run, checkpointId, actor, reason }) {
      if (!run?.id || !checkpointId || !actor || !reason) throw new Error('Checkpoint missing required fields');
      const snapshot = {
        version: 1,
        runId: run.id,
        checkpointId,
        actor,
        reason,
        createdAt: new Date().toISOString(),
        runFingerprint: fingerprint(run),
        run
      };
      const envelope = { ...snapshot, checkpointFingerprint: fingerprint(snapshot) };
      const destination = checkpointPath(run.id, checkpointId);
      const temporary = `${destination}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
      fs.renameSync(temporary, destination);
      return structuredClone(envelope);
    },

    load({ runId, checkpointId }) {
      const destination = checkpointPath(runId, checkpointId);
      if (!fs.existsSync(destination)) throw new Error(`Checkpoint not found: ${runId}/${checkpointId}`);
      const envelope = JSON.parse(fs.readFileSync(destination, 'utf8'));
      const { checkpointFingerprint, ...snapshot } = envelope;
      if (fingerprint(snapshot) !== checkpointFingerprint) throw new Error(`Checkpoint envelope corrupted: ${checkpointId}`);
      if (fingerprint(snapshot.run) !== snapshot.runFingerprint) throw new Error(`Checkpoint run corrupted: ${checkpointId}`);
      return structuredClone(envelope);
    },

    list(runId) {
      return fs.readdirSync(directory)
        .filter((name) => name.startsWith(`${runId}.`) && name.endsWith('.json'))
        .sort();
    }
  };
};
