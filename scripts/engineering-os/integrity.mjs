import { fingerprint } from './runtime.mjs';

export const sealRecord = (record) => {
  const payload = { ...record };
  delete payload.fingerprint;
  return { ...payload, fingerprint: fingerprint(payload) };
};

export const verifyRecord = (record, label = 'record') => {
  const payload = { ...record };
  const storedFingerprint = payload.fingerprint;
  delete payload.fingerprint;
  if (!storedFingerprint || fingerprint(payload) !== storedFingerprint) {
    throw new Error(`${label} integrity check failed`);
  }
  return record;
};
