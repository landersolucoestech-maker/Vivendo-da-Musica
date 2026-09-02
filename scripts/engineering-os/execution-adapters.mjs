import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fingerprint } from './runtime.mjs';

const normalizeRelative = (root, file) => path.relative(root, file).replaceAll('\\', '/');
const ensureInside = (root, requestedPath) => {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, requestedPath ?? '.');
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path escapes workspace: ${requestedPath}`);
  return resolved;
};
const requirePrefix = (relative, prefixes, label) => {
  if (!prefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) {
    throw new Error(`${label} outside allowed paths: ${relative}`);
  }
};
const writeText = ({ root, input, prefixes, label }) => {
  const file = ensureInside(root, input.path);
  const relative = normalizeRelative(root, file);
  requirePrefix(relative, prefixes, label);
  if (typeof input.content !== 'string') throw new Error(`${label} requires string content`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, input.content, 'utf8');
  return { path: relative, fingerprint: fingerprint(input.content), bytes: Buffer.byteLength(input.content) };
};

const runProcess = ({ cwd, command, args = [], timeoutMs = 300000 }) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd, shell: false, windowsHide: true, env: { ...process.env, CI: process.env.CI ?? '1' } });
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, timeoutMs);
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    if (timedOut) return reject(new Error(`Command timed out: ${command} ${args.join(' ')}`));
    resolve({ code, signal, stdout, stderr });
  });
});

export const createExecutionAdapters = ({ workspaceRoot, commandRunner = runProcess } = {}) => {
  if (!workspaceRoot) throw new Error('Execution adapters require workspaceRoot');
  const root = path.resolve(workspaceRoot);

  const qualityCommands = new Map([
    ['engineering:validate', ['npm', ['run', 'engineering:validate']]],
    ['typecheck', ['npm', ['run', 'typecheck']]],
    ['lint', ['npm', ['run', 'lint']]],
    ['test', ['npm', ['run', 'test']]],
    ['build', ['npm', ['run', 'build']]],
    ['test:performance', ['npm', ['run', 'test:performance']]],
    ['quality', ['npm', ['run', 'quality']]]
  ]);

  return {
    'repository.read': async ({ input = {} }) => {
      const file = ensureInside(root, input.path);
      const stat = fs.statSync(file);
      if (!stat.isFile()) throw new Error(`Repository read requires a file: ${input.path}`);
      const content = fs.readFileSync(file, 'utf8');
      return { path: normalizeRelative(root, file), content, fingerprint: fingerprint(content) };
    },

    'repository.write-source': async ({ input = {} }) => writeText({
      root,
      input,
      prefixes: ['src', 'scripts', 'supabase/functions'],
      label: 'Source write'
    }),

    'repository.write-test': async ({ input = {} }) => writeText({
      root,
      input,
      prefixes: ['src/tests', 'tests', 'e2e'],
      label: 'Test write'
    }),

    'repository.write-ci': async ({ input = {} }) => writeText({
      root,
      input,
      prefixes: ['.github/workflows'],
      label: 'CI write'
    }),

    'database.write-migration': async ({ input = {} }) => writeText({
      root,
      input,
      prefixes: ['supabase/migrations'],
      label: 'Migration write'
    }),

    'security.write-policy': async ({ input = {} }) => writeText({
      root,
      input,
      prefixes: ['engineering-os/policies', 'engineering-os/contracts', 'src/tests'],
      label: 'Security policy write'
    }),

    'release.write-metadata': async ({ input = {} }) => writeText({
      root,
      input,
      prefixes: ['engineering-os/releases'],
      label: 'Release metadata write'
    }),

    'quality.execute': async ({ input = {} }) => {
      const spec = qualityCommands.get(input.command);
      if (!spec) throw new Error(`Quality command not allowed: ${input.command}`);
      const [command, args] = spec;
      const result = await commandRunner({ cwd: root, command, args, timeoutMs: input.timeoutMs ?? 300000 });
      return {
        command: input.command,
        code: result.code,
        signal: result.signal,
        stdout: result.stdout,
        stderr: result.stderr,
        passed: result.code === 0,
        fingerprint: fingerprint({ command: input.command, code: result.code, stdout: result.stdout, stderr: result.stderr })
      };
    }
  };
};
