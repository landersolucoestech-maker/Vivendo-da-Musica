import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fingerprint } from './runtime.mjs';

const safeRunId = (runId) => {
  if (!/^[a-zA-Z0-9._-]+$/.test(runId)) throw new Error(`Invalid budget run id: ${runId}`);
  return runId;
};

export const createBudgetStore = ({ directory, now = () => Date.now() } = {}) => {
  if (!directory) throw new Error('Budget store requires a directory');
  const root = path.resolve(directory);
  fs.mkdirSync(root, { recursive: true });

  const fileFor = (runId) => path.join(root, `${safeRunId(runId)}.budget.json`);
  const lockFor = (runId) => `${fileFor(runId)}.lock`;

  const acquireLock = (runId) => {
    try {
      return fs.openSync(lockFor(runId), 'wx');
    } catch (error) {
      if (error?.code === 'EEXIST') throw new Error(`Budget state busy: ${runId}`);
      throw error;
    }
  };

  const releaseLock = (runId, fd) => {
    try { fs.closeSync(fd); } finally { fs.rmSync(lockFor(runId), { force: true }); }
  };

  const read = (runId) => {
    const file = fileFor(runId);
    if (!fs.existsSync(file)) return null;
    const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
    const actual = fingerprint(envelope.budget);
    if (actual !== envelope.fingerprint) throw new Error(`Budget integrity check failed: ${runId}`);
    return envelope.budget;
  };

  const write = (runId, budget) => {
    const file = fileFor(runId);
    const envelope = {
      version: 1,
      writtenAt: new Date(now()).toISOString(),
      fingerprint: fingerprint(budget),
      budget
    };
    const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, file);
    return structuredClone(budget);
  };

  const initial = ({ runId, maxCalls, maxTotalDurationMs }) => ({
    runId,
    calls: 0,
    totalDurationMs: 0,
    maxCalls,
    maxTotalDurationMs,
    createdAt: new Date(now()).toISOString(),
    updatedAt: new Date(now()).toISOString()
  });

  return {
    reserve({ runId, maxCalls, maxTotalDurationMs }) {
      if (!Number.isSafeInteger(maxCalls) || maxCalls <= 0) throw new Error('Invalid maxCalls');
      if (!Number.isSafeInteger(maxTotalDurationMs) || maxTotalDurationMs <= 0) throw new Error('Invalid maxTotalDurationMs');
      const fd = acquireLock(runId);
      try {
        const current = read(runId) ?? initial({ runId, maxCalls, maxTotalDurationMs });
        if (current.maxCalls !== maxCalls || current.maxTotalDurationMs !== maxTotalDurationMs) {
          throw new Error(`Budget policy mismatch: ${runId}`);
        }
        if (current.calls >= current.maxCalls) throw new Error('Tool call budget exhausted');
        if (current.totalDurationMs >= current.maxTotalDurationMs) throw new Error('Tool duration budget exhausted');
        const next = {
          ...current,
          calls: current.calls + 1,
          updatedAt: new Date(now()).toISOString()
        };
        return write(runId, next);
      } finally {
        releaseLock(runId, fd);
      }
    },

    recordDuration({ runId, durationMs }) {
      if (!Number.isSafeInteger(durationMs) || durationMs < 0) throw new Error('Invalid tool duration');
      const fd = acquireLock(runId);
      try {
        const current = read(runId);
        if (!current) throw new Error(`Budget not initialized: ${runId}`);
        const next = {
          ...current,
          totalDurationMs: current.totalDurationMs + durationMs,
          updatedAt: new Date(now()).toISOString()
        };
        return write(runId, next);
      } finally {
        releaseLock(runId, fd);
      }
    },

    inspect(runId) {
      const budget = read(runId);
      return budget ? structuredClone(budget) : null;
    }
  };
};
