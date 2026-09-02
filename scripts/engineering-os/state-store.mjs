import fs from 'node:fs';
import path from 'node:path';
import { fingerprint } from './runtime.mjs';

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

export class RunStateStore {
  constructor(baseDir) {
    this.baseDir = path.resolve(baseDir);
    ensureDir(this.baseDir);
  }

  fileFor(runId) {
    if (!/^[a-zA-Z0-9._-]+$/.test(runId)) throw new Error('Invalid run id');
    return path.join(this.baseDir, `${runId}.json`);
  }

  read(runId) {
    const file = this.fileFor(runId);
    if (!fs.existsSync(file)) return null;
    const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
    const actual = fingerprint(envelope.run);
    if (actual !== envelope.fingerprint) throw new Error(`State integrity check failed: ${runId}`);
    return envelope.run;
  }

  write(run, expectedFingerprint = null) {
    const file = this.fileFor(run.id);
    if (expectedFingerprint && fs.existsSync(file)) {
      const current = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (current.fingerprint !== expectedFingerprint) throw new Error(`Concurrent state modification detected: ${run.id}`);
    }

    const envelope = {
      version: 1,
      fingerprint: fingerprint(run),
      writtenAt: new Date().toISOString(),
      run,
    };
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(tmp, file);
    return envelope.fingerprint;
  }
}
