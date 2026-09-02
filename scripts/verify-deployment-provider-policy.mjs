import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const roots = ['.github/workflows', 'src/agentic', 'infra'];
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.toml']);
const forbiddenProviderName = ['ver', 'cel'].join('');
const forbiddenProviderPattern = new RegExp(`\\b${forbiddenProviderName}\\b`, 'i');

const collectFiles = async (root) => {
  const files = [];
  const visit = async (directory) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && textExtensions.has(extname(entry.name))) files.push(path);
    }
  };
  await visit(root);
  return files;
};

const violations = [];
for (const root of roots) {
  for (const file of await collectFiles(root)) {
    const content = await readFile(file, 'utf8');
    if (forbiddenProviderPattern.test(content) || forbiddenProviderPattern.test(file)) {
      violations.push(relative(process.cwd(), file).replaceAll('\\', '/'));
    }
  }
}

if (violations.length > 0) {
  console.error('Deployment provider policy violation: forbidden provider reference found.');
  for (const violation of violations.sort()) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Deployment provider policy OK: operational surfaces contain only approved hosting provider integrations.');
