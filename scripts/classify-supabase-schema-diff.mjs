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

const preservedForeignKeys = [
  {
    table: 'candidate_profiles',
    constraint: 'candidate_profiles_user_id_fkey',
    definition: 'FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
  },
  {
    table: 'company_members',
    constraint: 'company_members_user_id_fkey',
    definition: 'FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
  },
  {
    table: 'company_profiles',
    constraint: 'company_profiles_owner_user_id_fkey',
    definition: 'FOREIGN KEY (owner_user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
  },
  {
    table: 'lesson_comments',
    constraint: 'lesson_comments_lesson_id_fkey',
    definition: 'FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE',
  },
  {
    table: 'lesson_materials',
    constraint: 'lesson_materials_lesson_id_fkey',
    definition: 'FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE',
  },
  {
    table: 'opportunities',
    constraint: 'opportunities_created_by_fkey',
    definition: 'FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL',
  },
  {
    table: 'opportunity_application_messages',
    constraint: 'opportunity_application_messages_sender_id_fkey',
    definition: 'FOREIGN KEY (sender_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
  },
  {
    table: 'producer_financial_accounts',
    constraint: 'producer_financial_accounts_producer_id_fkey',
    definition: 'FOREIGN KEY (producer_id) REFERENCES user_profiles(user_id) ON DELETE RESTRICT',
  },
  {
    table: 'producer_payout_events',
    constraint: 'producer_payout_events_producer_id_fkey',
    definition: 'FOREIGN KEY (producer_id) REFERENCES user_profiles(user_id) ON DELETE RESTRICT',
  },
  {
    table: 'product_questions',
    constraint: 'product_questions_answered_by_fkey',
    definition: 'FOREIGN KEY (answered_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL',
  },
  {
    table: 'product_questions',
    constraint: 'product_questions_user_id_fkey',
    definition: 'FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
  },
  {
    table: 'product_reviews',
    constraint: 'product_reviews_user_id_fkey',
    definition: 'FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE',
  },
];

function augmentDiffForConstraintReplacement(sourceSql) {
  const replacesLessonsPrimaryKey = /drop\s+constraint\s+"lessons_pkey"\s*;/i.test(sourceSql);
  const replacesProfilesPrimaryKey = /drop\s+constraint\s+"user_profiles_pkey"\s*;/i.test(sourceSql);

  if (!replacesLessonsPrimaryKey && !replacesProfilesPrimaryKey) {
    return { applied: false, foreignKeys: [] };
  }

  const activeForeignKeys = preservedForeignKeys.filter(({ constraint }) => {
    const escapedConstraint = constraint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`drop\\s+constraint\\s+"${escapedConstraint}"\\s*;`, 'i').test(sourceSql);
  });

  if (activeForeignKeys.length === 0) {
    return { applied: false, foreignKeys: [] };
  }

  const prelude = activeForeignKeys
    .map(
      ({ table, constraint }) =>
        `alter table "public"."${table}" drop constraint "${constraint}";`,
    )
    .join('\n');
  const epilogue = activeForeignKeys
    .map(
      ({ table, constraint, definition }) =>
        `alter table "public"."${table}" add constraint "${constraint}" ${definition};`,
    )
    .join('\n');

  const augmentedSql = [
    '-- Temporary dependency cycle required while canonical primary/unique indexes are replaced.',
    'set local search_path = public, auth, app_private, authz_private, pg_catalog;',
    prelude,
    '',
    sourceSql.trim(),
    '',
    '-- Restore foreign keys that remain part of the canonical schema.',
    epilogue,
    '',
  ].join('\n');

  writeFileSync(inputPath, augmentedSql, 'utf8');
  return {
    applied: true,
    foreignKeys: activeForeignKeys.map(({ table, constraint }) => ({
      schema: 'public',
      table,
      constraint,
    })),
  };
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

const dependencyCycle = augmentDiffForConstraintReplacement(sql);
const report = {
  source_file: basename(inputPath),
  empty: executableSql.length === 0,
  statement_counts: counts,
  destructive_statement_count: destructiveCount,
  requires_manual_review: destructiveCount > 0,
  dependency_cycle: dependencyCycle,
  objects,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
