import { readFile } from 'node:fs/promises';

const layoutFiles = [
  'src/pages/Index.tsx',
  'src/app/layouts/PublicLayout.tsx',
  'src/app/layouts/StudentLayout.tsx',
  'src/app/layouts/AdminLayout.tsx',
  'src/app/layouts/InstructorLayout.tsx',
  'src/app/layouts/ProducerLayout.tsx',
  'src/app/layouts/AffiliateLayout.tsx',
  'src/app/layouts/CompanyLayout.tsx',
];

const failures = [];

for (const path of layoutFiles) {
  const source = await readFile(path, 'utf8');

  if (!source.includes('<Navigation />')) {
    failures.push(`${path}: cabeçalho global ausente.`);
  }

  if (!source.includes('h-dvh') || !source.includes('overflow-hidden')) {
    failures.push(`${path}: a viewport precisa permanecer travada em h-dvh/overflow-hidden.`);
  }

  if (!source.includes('overflow-y-auto')) {
    failures.push(`${path}: não há uma área interna dedicada à rolagem.`);
  }

  if (!source.includes('overscroll-contain')) {
    failures.push(`${path}: a rolagem interna precisa conter overscroll.`);
  }

  if (source.includes('min-h-screen overflow-x-hidden')) {
    failures.push(`${path}: voltou a permitir rolagem do documento inteiro.`);
  }

  const navigationIndex = source.indexOf('<Navigation />');
  const scrollingIndex = source.indexOf('overflow-y-auto');
  if (navigationIndex === -1 || scrollingIndex === -1 || navigationIndex > scrollingIndex) {
    failures.push(`${path}: o cabeçalho deve estar antes e fora do contêiner rolável.`);
  }
}

const navigationSource = await readFile('src/shared/components/Navigation.tsx', 'utf8');
if (!navigationSource.includes('className="fixed inset-x-0 top-0')) {
  failures.push('src/shared/components/Navigation.tsx: o cabeçalho global precisa usar position: fixed no topo da viewport.');
}
if (!navigationSource.includes('z-[100]')) {
  failures.push('src/shared/components/Navigation.tsx: o cabeçalho global precisa permanecer acima das áreas roláveis.');
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log(`Cabeçalho fixo validado em ${layoutFiles.length} layouts.`);
