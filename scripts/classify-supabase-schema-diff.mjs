import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  console.error('Uso: node scripts/classify-supabase-schema-diff.mjs <diff.sql> <report.json>');
  process.exit(1);
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
const sql = readFileSync(inputPath, 'utf8');
const executableSql = sql
  .split('\n')
  .filter((line) => !/^\s*(--|$)/.test(line))
  .join('\n')
  .trim();

const patterns = {
  create_table: /\bcreate\s+table\b/gi,
  create_type: /\bcreate\s+type\b/gi,
  create_function: /\bcreate(?:\s+or\s+replace)?\s+function\b/gi,
  create_policy: /\bcreate\s+policy\b/gi,
  create_trigger: /\bcreate\s+trigger\b/gi,
  create_index: /\bcreate(?:\s+unique)?\s+index\b/gi,
  alter_table: /\balter\s+table\b/gi,
  alter_type: /\balter\s+type\b/gi,
  grant: /\bgrant\b/gi,
  revoke: /\brevoke\b/gi,
  drop_policy: /\bdrop\s+policy\b/gi,
  drop_trigger: /\bdrop\s+trigger\b/gi,
  drop_index: /\bdrop\s+index\b/gi,
  drop_function: /\bdrop\s+function\b/gi,
  drop_table: /\bdrop\s+table\b/gi,
  drop_type: /\bdrop\s+type\b/gi,
  drop_schema: /\bdrop\s+schema\b/gi,
  drop_column: /\bdrop\s+column\b/gi,
  truncate: /\btruncate\b/gi,
  delete: /\bdelete\s+from\b/gi,
  update: /\bupdate\s+[\w".]+\s+set\b/gi,
  insert: /\binsert\s+into\b/gi,
};

const counts = Object.fromEntries(
  Object.entries(patterns).map(([name, pattern]) => [name, executableSql.match(pattern)?.length ?? 0]),
);

const destructiveKeys = [
  'drop_table',
  'drop_type',
  'drop_schema',
  'drop_column',
  'truncate',
  'delete',
];
const destructiveCount = destructiveKeys.reduce((sum, key) => sum + counts[key], 0);

const objectPatterns = {
  dropped_tables: /drop\s+table(?:\s+if\s+exists)?\s+([^;]+);/gi,
  dropped_types: /drop\s+type(?:\s+if\s+exists)?\s+([^;]+);/gi,
  dropped_columns: /alter\s+table\s+([^;]+?)\s+drop\s+column(?:\s+if\s+exists)?\s+([^;\s,]+)/gi,
  created_tables: /create\s+table(?:\s+if\s+not\s+exists)?\s+([^\s(]+)/gi,
};

function collect(pattern, formatter = (match) => match[1]?.trim()) {
  const values = new Set();
  for (const match of executableSql.matchAll(pattern)) {
    const value = formatter(match);
    if (value) values.add(value.replaceAll('"', ''));
  }
  return [...values].sort();
}

const objects = {
  dropped_tables: collect(objectPatterns.dropped_tables),
  dropped_types: collect(objectPatterns.dropped_types),
  dropped_columns: collect(
    objectPatterns.dropped_columns,
    (match) => `${match[1]?.trim()}.${match[2]?.trim()}`,
  ),
  created_tables: collect(objectPatterns.created_tables),
};

const report = {
  source_file: basename(inputPath),
  empty: executableSql.length === 0,
  statement_counts: counts,
  destructive_statement_count: destructiveCount,
  requires_manual_review: destructiveCount > 0,
  objects,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
