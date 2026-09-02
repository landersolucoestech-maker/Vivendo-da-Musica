import { fingerprint } from './runtime.mjs';

export const createIdempotencyStore = ({ now = () => Date.now(), ttlMs = 86400000 } = {}) => {
  const entries = new Map();

  const purge = () => {
    for (const [key, entry] of entries.entries()) {
      if (entry.expiresAtMs <= now()) entries.delete(key);
    }
  };

  return {
    reserve({ key, request }) {
      if (!key) throw new Error('Idempotency key is required');
      purge();
      const requestFingerprint = fingerprint(request);
      const existing = entries.get(key);
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) throw new Error(`Idempotency key reused with different request: ${key}`);
        return { replay: existing.status === 'completed', pending: existing.status === 'pending', result: existing.result ?? null };
      }
      entries.set(key, {
        key,
        requestFingerprint,
        status: 'pending',
        createdAt: new Date(now()).toISOString(),
        expiresAtMs: now() + ttlMs,
        result: null
      });
      return { replay: false, pending: false, result: null };
    },

    complete({ key, result }) {
      purge();
      const existing = entries.get(key);
      if (!existing || existing.status !== 'pending') throw new Error(`Idempotency reservation missing: ${key}`);
      entries.set(key, {
        ...existing,
        status: 'completed',
        completedAt: new Date(now()).toISOString(),
        result: structuredClone(result)
      });
      return structuredClone(result);
    },

    fail({ key }) {
      purge();
      const existing = entries.get(key);
      if (existing?.status === 'pending') entries.delete(key);
    },

    inspect(key) {
      purge();
      const entry = entries.get(key);
      return entry ? structuredClone(entry) : null;
    }
  };
};
