import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const failures = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
};

const modalPrimitiveFiles = [
  'src/shared/components/ui/dialog.tsx',
  'src/shared/components/ui/sheet.tsx',
  'src/shared/components/ui/alert-dialog.tsx',
];

for (const path of modalPrimitiveFiles) {
  const source = await readFile(path, 'utf8');
  if (!source.includes('data-vdm-modal="popup"')) {
    failures.push(`${path}: o conteúdo modal não está identificado como popup.`);
  }
  if (!source.includes('data-vdm-motion="fade-zoom"')) {
    failures.push(`${path}: a animação modal não está limitada a fade + zoom.`);
  }
  if (!source.includes('left-1/2 top-1/2') || !source.includes('-translate-x-1/2 -translate-y-1/2')) {
    failures.push(`${path}: o modal não está centralizado na viewport.`);
  }
}

const sourceFiles = await walk('src');
for (const path of sourceFiles) {
  const source = await readFile(path, 'utf8');
  const usesModal = /(?:DialogContent|AlertDialogContent|SheetContent)/.test(source);
  if (usesModal && /(?:slide-in-from|slide-out-to)-(?:left|right|top|bottom)/.test(source)) {
    failures.push(`${path}: modal usa animação lateral slide-in/slide-out.`);
  }
  if (/SheetContent[\s\S]{0,180}\bside=/.test(source)) {
    failures.push(`${path}: SheetContent ainda define lado e pode voltar a abrir como painel lateral.`);
  }
}

const editor = await readFile('src/modules/marketplace/components/BeatLicenseEditor.tsx', 'utf8');
for (const required of [
  'type="file"',
  'PDF, DOC ou DOCX',
  'uploadContract',
  'removeContract',
  'getDownloadUrl',
  'beatLicenseContractService',
]) {
  if (!editor.includes(required)) {
    failures.push(`BeatLicenseEditor.tsx: fluxo de contrato incompleto; ausente ${required}.`);
  }
}

const contractService = await readFile('src/modules/marketplace/services/beat-license-contract.service.ts', 'utf8');
for (const required of [
  "const CONTRACT_BUCKET = 'beat-license-contracts'",
  'MAX_CONTRACT_SIZE = 20 * 1024 * 1024',
  '.upload(path, file',
  '.createSignedUrl(',
  '.remove([previousPath])',
]) {
  if (!contractService.includes(required)) {
    failures.push(`beat-license-contract.service.ts: implementação incompleta; ausente ${required}.`);
  }
}

const migration = await readFile('supabase/migrations/20260804011000_add_beat_license_contract_uploads.sql', 'utf8');
for (const required of [
  'license_contract_path',
  "'beat-license-contracts'",
  'beat_license_contracts_owner_insert',
  'beat_license_contracts_owner_read',
]) {
  if (!migration.includes(required)) {
    failures.push(`Migração de contratos incompleta; ausente ${required}.`);
  }
}

const accessFunction = await readFile('supabase/functions/download-access/index.ts', 'utf8');
if (!accessFunction.includes("source: 'producer_upload'")) {
  failures.push('download-access: o contrato enviado pelo produtor não é priorizado.');
}
if (!accessFunction.includes("source: 'generated_fallback'")) {
  failures.push('download-access: a contingência automática foi removida indevidamente.');
}

if (failures.length) throw new Error(failures.join('\n'));

console.log('Modais popup e upload privado de contratos validados.');
