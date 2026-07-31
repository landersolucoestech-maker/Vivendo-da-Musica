import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  console.error('SUPABASE_PROJECT_REF não definido.');
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['supabase', 'gen', 'types', 'typescript', '--project-id', projectRef],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);

if (result.status !== 0 || !result.stdout.trim()) {
  console.error('Não foi possível gerar os tipos do Supabase.');
  process.exit(result.status ?? 1);
}

const outputPath = resolve('src/integrations/supabase/types.ts');
writeFileSync(outputPath, result.stdout, 'utf8');
console.log(`Tipos gerados em ${outputPath}`);
