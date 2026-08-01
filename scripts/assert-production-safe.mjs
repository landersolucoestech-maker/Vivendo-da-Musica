import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DEV_PROJECT_REF = 'ywirfqvobfnunlcsnptm';
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const edgeFunctionsDir = new URL('../supabase/functions/', import.meta.url);

const forbiddenSqlPatterns = [
  { pattern: /create\s+policy\s+"?[\w-]*(?:dev|demo)[\w-]*"?[\s\S]*?\bto\s+anon\b/gi, reason: 'política de escrita/leitura demo destinada a anon' },
  { pattern: /grant\s+execute[\s\S]*?\bto\s+(?:public|anon)\b/gi, reason: 'EXECUTE público ou anônimo em função/RPC' },
  { pattern: /create\s+policy[\s\S]*?\bfor\s+(?:insert|update|delete|all)\s+to\s+anon\b/gi, reason: 'política anônima de escrita' },
];

async function listFilesRecursively(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) files.push(...await listFilesRecursively(child));
    else files.push(child);
  }
  return files;
}

const failures = [];
const migrationFiles = (await listFilesRecursively(migrationsDir)).filter((url) => url.pathname.endsWith('.sql'));
for (const fileUrl of migrationFiles) {
  const content = await readFile(fileUrl, 'utf8');
  for (const rule of forbiddenSqlPatterns) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) failures.push(`${fileUrl.pathname.split('/').pop()}: ${rule.reason}`);
  }
}

const edgeFiles = (await listFilesRecursively(edgeFunctionsDir)).filter((url) => url.pathname.endsWith('.ts'));
for (const fileUrl of edgeFiles) {
  const content = await readFile(fileUrl, 'utf8');
  if (content.includes(DEV_PROJECT_REF)) failures.push(`${fileUrl.pathname.split('/supabase/functions/')[1]}: referência explícita ao projeto dev`);
}

const targetRef = process.env.SUPABASE_PROJECT_REF?.trim();
if (!targetRef) failures.push('SUPABASE_PROJECT_REF de produção não foi informado.');
if (targetRef === DEV_PROJECT_REF) failures.push('SUPABASE_PROJECT_REF de produção aponta para o projeto dev.');
if (process.env.VITE_DISABLE_AUTH === 'true') failures.push('VITE_DISABLE_AUTH não pode estar ativo em produção.');
if (process.env.VITE_USE_MOCK_DATA === 'true') failures.push('VITE_USE_MOCK_DATA não pode estar ativo em produção.');

if (failures.length > 0) {
  console.error('Release de produção bloqueada por riscos não resolvidos:');
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Gate de segurança de produção aprovado.');
