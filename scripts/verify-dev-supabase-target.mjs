import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const DEV_PROJECT_REF = 'ywirfqvobfnunlcsnptm';
const DEV_PROJECT_URL = `https://${DEV_PROJECT_REF}.supabase.co`;
const FORBIDDEN_PROJECT_REFS = new Set([
  ['ehaehi', 'oqaqvyfgcetylh'].join(''),
]);

const requiredFiles = new Map([
  ['supabase/config.toml', [`project_id = "${DEV_PROJECT_REF}"`]],
  ['.env.example', [`VITE_SUPABASE_URL=${DEV_PROJECT_URL}`]],
  ['.github/workflows/dev-pages-preview.yml', [`VITE_SUPABASE_URL: ${DEV_PROJECT_URL}`]],
  ['.github/workflows/dev-quality.yml', [`VITE_SUPABASE_URL: ${DEV_PROJECT_URL}`]],
  ['.github/workflows/quality.yml', [`VITE_SUPABASE_URL: ${DEV_PROJECT_URL}`]],
  [
    '.github/workflows/deploy-supabase.yml',
    [
      `DEV_SUPABASE_PROJECT_REF: ${DEV_PROJECT_REF}`,
      'if [ "${{ inputs.environment }}" = "dev" ] && [ "$GITHUB_REF_NAME" != "dev" ]; then',
      'if [ "${{ inputs.environment }}" = "dev" ]; then',
      'echo "SUPABASE_PROJECT_REF=${DEV_SUPABASE_PROJECT_REF}" >> "$GITHUB_ENV"',
    ],
  ],
  ['scripts/assert-production-safe.mjs', [`const DEV_PROJECT_REF = '${DEV_PROJECT_REF}';`]],
]);

const searchableExtensions = new Set([
  '.cjs', '.env', '.example', '.js', '.json', '.jsx', '.md', '.mjs', '.mts',
  '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const searchableNames = new Set(['Dockerfile', 'README.md']);
const ignoredDirectories = new Set([
  '.git', 'artifacts', 'coverage', 'dist', 'node_modules', 'playwright-report', 'test-results',
]);

async function listRepositoryFiles(directory = '.') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listRepositoryFiles(path));
    else if (searchableExtensions.has(extname(entry.name)) || searchableNames.has(entry.name)) files.push(path);
  }

  return files;
}

const failures = [];

for (const [path, expectedSnippets] of requiredFiles) {
  let source;
  try {
    source = await readFile(path, 'utf8');
  } catch {
    failures.push(`${path}: arquivo obrigatório ausente.`);
    continue;
  }

  for (const snippet of expectedSnippets) {
    if (!source.includes(snippet)) {
      failures.push(`${path}: configuração obrigatória ausente: ${snippet}`);
    }
  }
}

for (const path of await listRepositoryFiles()) {
  const source = await readFile(path, 'utf8');
  for (const forbiddenRef of FORBIDDEN_PROJECT_REFS) {
    if (source.includes(forbiddenRef)) {
      failures.push(`${relative('.', path)}: referência proibida ao projeto Supabase antigo ${forbiddenRef}.`);
    }
  }
}

if (failures.length > 0) {
  throw new Error([
    `Configuração Supabase da dev inválida; esperado ${DEV_PROJECT_REF}.`,
    ...[...new Set(failures)].sort(),
  ].join('\n'));
}

console.log(`Projeto Supabase da dev validado: ${DEV_PROJECT_REF}.`);
