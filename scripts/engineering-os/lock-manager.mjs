import crypto from 'node:crypto';

export const createLockManager = ({ now = () => Date.now() } = {}) => {
  const locks = new Map();

  const active = (resource) => {
    const lock = locks.get(resource);
    if (!lock) return null;
    if (lock.expiresAtMs <= now()) {
      locks.delete(resource);
      return null;
    }
    return lock;
  };

  return {
    acquire({ resource, owner, ttlMs = 120000 }) {
      if (!resource || !owner) throw new Error('Lock requires resource and owner');
      if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 3600000) throw new Error('Invalid lock TTL');
      const existing = active(resource);
      if (existing) throw new Error(`Resource locked by ${existing.owner}: ${resource}`);
      const lock = {
        resource,
        owner,
        token: crypto.randomUUID(),
        acquiredAt: new Date(now()).toISOString(),
        expiresAtMs: now() + ttlMs
      };
      locks.set(resource, lock);
      return { ...lock, expiresAt: new Date(lock.expiresAtMs).toISOString() };
    },

    renew({ resource, token, ttlMs = 120000 }) {
      const lock = active(resource);
      if (!lock || lock.token !== token) throw new Error(`Cannot renew lock: ${resource}`);
      lock.expiresAtMs = now() + ttlMs;
      locks.set(resource, lock);
      return { ...lock, expiresAt: new Date(lock.expiresAtMs).toISOString() };
    },

    release({ resource, token }) {
      const lock = active(resource);
      if (!lock) return false;
      if (lock.token !== token) throw new Error(`Lock token mismatch: ${resource}`);
      locks.delete(resource);
      return true;
    },

    inspect(resource) {
      const lock = active(resource);
      return lock ? { ...lock, expiresAt: new Date(lock.expiresAtMs).toISOString() } : null;
    }
  };
};
