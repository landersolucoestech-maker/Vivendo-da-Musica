import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const forbidden = ['lova' + 'ble'];
const binaryExtensions = new Set([
  '.avif', '.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.pdf', '.png', '.webp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.zip', '.gz', '.tgz', '.mp3', '.mp4',
  '.wav', '.webm', '.mov', '.avi', '.bin', '.lockb',
]);
const ignoredPaths = new Set([
  'scripts/verify-legacy-branding.mjs',
]);

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const violations = [];
for (const file of tracked) {
  if (ignoredPaths.has(file) || binaryExtensions.has(path.extname(file).toLowerCase())) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const normalized = content.toLowerCase();
  for (const token of forbidden) {
    if (normalized.includes(token)) {
      violations.push(`${file}: contém branding/dependência legada proibida`);
    }
  }
}

if (violations.length > 0) {
  console.error('Gate de branding legado reprovado:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Gate de branding legado aprovado.');
