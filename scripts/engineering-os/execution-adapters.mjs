import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fingerprint } from './runtime.mjs';

const ensureInside = (root, requestedPath) => {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, requestedPath ?? '.');
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path escapes workspace: ${requestedPath}`);
  return resolved;
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
      return { path: path.relative(root, file), content, fingerprint: fingerprint(content) };
    },

    'repository.write-source': async ({ input = {} }) => {
      const file = ensureInside(root, input.path);
      if (typeof input.content !== 'string') throw new Error('Source write requires string content');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, input.content, 'utf8');
      return { path: path.relative(root, file), fingerprint: fingerprint(input.content), bytes: Buffer.byteLength(input.content) };
    },

    'repository.write-test': async ({ input = {} }) => {
      const file = ensureInside(root, input.path);
      if (typeof input.content !== 'string') throw new Error('Test write requires string content');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, input.content, 'utf8');
      return { path: path.relative(root, file), fingerprint: fingerprint(input.content), bytes: Buffer.byteLength(input.content) };
    },

    'database.write-migration': async ({ input = {} }) => {
      const file = ensureInside(root, input.path);
      const relative = path.relative(root, file).replaceAll('\\', '/');
      if (!relative.startsWith('supabase/migrations/')) throw new Error(`Migration write outside migration directory: ${relative}`);
      if (typeof input.content !== 'string') throw new Error('Migration write requires string content');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, input.content, 'utf8');
      return { path: relative, fingerprint: fingerprint(input.content), bytes: Buffer.byteLength(input.content) };
    },

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
