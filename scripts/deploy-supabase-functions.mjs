import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
if (!projectRef) {
  console.error('SUPABASE_PROJECT_REF é obrigatório.');
  process.exit(1);
}
if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error('SUPABASE_ACCESS_TOKEN é obrigatório.');
  process.exit(1);
}

const functionsDirectory = new URL('../supabase/functions/', import.meta.url);
const artifactsDirectory = resolve('artifacts/supabase-functions');

// These functions intentionally authenticate outside the Supabase platform JWT
// gateway: public catalogs/previews, isolated DEV interactions, checkout entry
// points, or provider webhooks that validate their own cryptographic signature.
const noVerifyJwtFunctions = new Set([
  'api-v1',
  'create-beat-checkout',
  'create-course-checkout',
  'create-digital-product-checkout',
  'download-access',
  'manage-service-catalog',
  'manage-service-requests',
  'payment-webhook',
  'service-delivery-file-access',
  'stripe-beat-webhook',
  'stripe-digital-product-webhook',
  'vivendo-preview',
]);

const entries = await readdir(functionsDirectory, { withFileTypes: true });
const functions = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

if (functions.length === 0) {
  console.error('Nenhuma Edge Function foi encontrada em supabase/functions.');
  process.exit(1);
}

const unknownPublicFunctions = [...noVerifyJwtFunctions].filter((name) => !functions.includes(name));
if (unknownPublicFunctions.length > 0) {
  console.error(`Funções sem JWT não versionadas: ${unknownPublicFunctions.join(', ')}`);
  process.exit(1);
}

await mkdir(artifactsDirectory, { recursive: true });
const summary = [];
const failures = [];

for (const name of functions) {
  const noVerifyJwt = noVerifyJwtFunctions.has(name);
  const args = ['supabase', 'functions', 'deploy', name, '--project-ref', projectRef];
  if (noVerifyJwt) args.push('--no-verify-jwt');

  let succeeded = false;
  const attempts = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log(`Publicando ${name}${noVerifyJwt ? ' sem JWT da plataforma' : ''} (tentativa ${attempt}/2)...`);
    const result = spawnSync('npx', args, {
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
      shell: process.platform === 'win32',
    });

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);

    attempts.push({
      attempt,
      status: result.status,
      signal: result.signal,
      error: result.error?.message ?? null,
      stdout,
      stderr,
    });

    if (result.status === 0) {
      succeeded = true;
      break;
    }
  }

  const result = { name, noVerifyJwt, succeeded, attempts };
  summary.push(result);
  await writeFile(
    resolve(artifactsDirectory, `${name}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );

  if (!succeeded) failures.push(name);
}

await writeFile(
  resolve(artifactsDirectory, 'summary.json'),
  `${JSON.stringify({ projectRef, total: functions.length, failures, functions: summary }, null, 2)}\n`,
  'utf8',
);

if (failures.length > 0) {
  console.error(`Falha ao publicar ${failures.length} Edge Function(s): ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`${functions.length} Edge Functions Supabase publicadas com sucesso.`);
