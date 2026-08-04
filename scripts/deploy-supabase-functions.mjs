import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

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
const noVerifyJwtFunctions = new Set([
  'api-v1',
  'payment-webhook',
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

for (const name of functions) {
  const noVerifyJwt = noVerifyJwtFunctions.has(name);
  const args = ['supabase', 'functions', 'deploy', name, '--project-ref', projectRef];
  if (noVerifyJwt) args.push('--no-verify-jwt');

  console.log(`Publicando ${name}${noVerifyJwt ? ' sem JWT da plataforma' : ''}...`);
  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`${functions.length} Edge Functions Supabase publicadas com sucesso.`);
