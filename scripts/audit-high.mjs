import { execFileSync } from 'node:child_process';

const allowedAdvisories = new Set([
  'https://github.com/advisories/GHSA-qwww-vcr4-c8h2',
]);

let report;
try {
  const output = execFileSync('npm', ['audit', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  report = JSON.parse(output);
} catch (error) {
  const stdout = error?.stdout?.toString?.() ?? '';
  if (!stdout.trim()) throw error;
  report = JSON.parse(stdout);
}

const blocked = [];
const allowed = [];

for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;

  const via = Array.isArray(vulnerability.via) ? vulnerability.via : [];
  const advisoryUrls = via
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .map((entry) => entry.url)
    .filter(Boolean);
  const indirectPackages = via.filter((entry) => typeof entry === 'string');

  const isDirectScopedException = packageName === 'react-router'
    && advisoryUrls.length > 0
    && advisoryUrls.every((url) => allowedAdvisories.has(url));

  const isIndirectScopedException = packageName === 'react-router-dom'
    && advisoryUrls.length === 0
    && indirectPackages.length > 0
    && indirectPackages.every((dependency) => dependency === 'react-router');

  if (isDirectScopedException || isIndirectScopedException) {
    allowed.push({ packageName, advisoryUrls, indirectPackages });
  } else {
    blocked.push({ packageName, severity: vulnerability.severity, advisoryUrls, indirectPackages });
  }
}

if (allowed.length) {
  console.warn('Exceção temporária e restrita aplicada: advisory RSC do React Router em SPA Vite sem RSC/server runtime.');
  for (const item of allowed) {
    const references = [...item.advisoryUrls, ...item.indirectPackages].join(', ');
    console.warn(`- ${item.packageName}: ${references}`);
  }
}

if (blocked.length) {
  console.error('Vulnerabilidades high/critical bloqueantes:');
  for (const item of blocked) {
    const references = [...item.advisoryUrls, ...item.indirectPackages].join(', ') || 'sem referência identificada';
    console.error(`- ${item.packageName} (${item.severity}): ${references}`);
  }
  process.exit(1);
}

console.log('Gate de vulnerabilidades high/critical aprovado.');
