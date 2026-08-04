import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = readFileSync(resolve('supabase/config.toml'), 'utf8');
const configuredProjectRef = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || configuredProjectRef;

if (!projectRef) {
  console.error('Não foi possível resolver o project ref pelo ambiente ou por supabase/config.toml.');
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['supabase', 'gen', 'types', 'typescript', '--project-id', projectRef],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);

if (result.status !== 0 || !result.stdout.trim()) {
  console.error(`Não foi possível gerar os tipos do Supabase para ${projectRef}.`);
  process.exit(result.status ?? 1);
}

const outputPath = resolve('src/integrations/supabase/types.ts');
writeFileSync(outputPath, result.stdout, 'utf8');
console.log(`Tipos do projeto ${projectRef} gerados em ${outputPath}.`);
