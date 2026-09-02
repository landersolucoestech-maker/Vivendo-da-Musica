import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ensureDir = (directory) => fs.mkdirSync(directory, { recursive: true });
const safeId = (value) => {
  if (!/^[a-zA-Z0-9._:-]+$/.test(value)) throw new Error(`Invalid lease key: ${value}`);
  return value.replace(/:/g, '__');
};

export const createLeaseStore = ({ directory, now = () => Date.now() }) => {
  if (!directory) throw new Error('Lease store requires a directory');
  const root = path.resolve(directory);
  ensureDir(root);

  const fileFor = (resource) => path.join(root, `${safeId(resource)}.lease.json`);
  const readRaw = (resource) => {
    const file = fileFor(resource);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  };
  const writeAtomic = (resource, value) => {
    const file = fileFor(resource);
    const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, file);
  };
  const active = (lease) => lease && lease.expiresAtMs > now();

  return {
    acquire({ resource, owner, ttlMs = 60000 }) {
      if (!resource || !owner) throw new Error('Lease requires resource and owner');
      if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 3600000) throw new Error('Invalid lease TTL');
      const existing = readRaw(resource);
      if (active(existing) && existing.owner !== owner) throw new Error(`Lease already held: ${resource}`);
      const lease = {
        resource,
        owner,
        token: crypto.randomUUID(),
        acquiredAt: new Date(now()).toISOString(),
        expiresAt: new Date(now() + ttlMs).toISOString(),
        expiresAtMs: now() + ttlMs
      };
      writeAtomic(resource, lease);
      return structuredClone(lease);
    },

    renew({ resource, owner, token, ttlMs = 60000 }) {
      const existing = readRaw(resource);
      if (!active(existing)) throw new Error(`Lease expired or missing: ${resource}`);
      if (existing.owner !== owner || existing.token !== token) throw new Error(`Lease ownership mismatch: ${resource}`);
      const renewed = {
        ...existing,
        expiresAt: new Date(now() + ttlMs).toISOString(),
        expiresAtMs: now() + ttlMs
      };
      writeAtomic(resource, renewed);
      return structuredClone(renewed);
    },

    release({ resource, owner, token }) {
      const existing = readRaw(resource);
      if (!existing) return false;
      if (existing.owner !== owner || existing.token !== token) throw new Error(`Lease ownership mismatch: ${resource}`);
      fs.rmSync(fileFor(resource), { force: true });
      return true;
    },

    get(resource) {
      const lease = readRaw(resource);
      if (!active(lease)) {
        if (lease) fs.rmSync(fileFor(resource), { force: true });
        return null;
      }
      return structuredClone(lease);
    }
  };
};
