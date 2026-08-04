import { readFile } from 'node:fs/promises';

const fixedHeaderStructures = [
  'src/pages/Index.tsx',
  'src/app/layouts/PublicLayout.tsx',
  'src/app/layouts/StudentLayout.tsx',
  'src/app/layouts/AdminLayout.tsx',
  'src/app/layouts/InstructorLayout.tsx',
  'src/app/layouts/ProducerLayout.tsx',
  'src/app/layouts/AffiliateLayout.tsx',
  'src/app/layouts/CompanyLayout.tsx',
  'src/modules/lessons/pages/Lesson.tsx',
];

const portalLayouts = [
  'src/app/layouts/StudentLayout.tsx',
  'src/app/layouts/AdminLayout.tsx',
  'src/app/layouts/InstructorLayout.tsx',
  'src/app/layouts/ProducerLayout.tsx',
  'src/app/layouts/AffiliateLayout.tsx',
  'src/app/layouts/CompanyLayout.tsx',
];

const portalSidebars = [
  'src/shared/components/StudentSidebar.tsx',
  'src/shared/components/AdminSidebar.tsx',
  'src/shared/components/InstructorSidebar.tsx',
  'src/shared/components/ProducerSidebar.tsx',
  'src/shared/components/AffiliateSidebar.tsx',
  'src/shared/components/CompanySidebar.tsx',
];

const failures = [];
const directPaddingPattern = /(?:^|\s)(?:[a-z]+:)*p(?:[trblxy])?-[^\s]+/;

for (const path of fixedHeaderStructures) {
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

  const scrollSurfaceMatch = source.match(
    /<(?:main|div)[^>]*data-testid="[^"]*-content-scroll"[^>]*className="([^"]+)"/s,
  );
  if (!scrollSurfaceMatch) {
    failures.push(`${path}: a superfície principal de rolagem não foi identificada.`);
  } else if (directPaddingPattern.test(scrollSurfaceMatch[1])) {
    failures.push(
      `${path}: padding aplicado diretamente à scrollbar cria uma faixa que encobre o conteúdo. Use um contêiner interno.`,
    );
  }
}

for (const path of portalLayouts) {
  const source = await readFile(path, 'utf8');
  if (!source.includes('fixed bottom-0 left-0 right-0 top-[7.5rem]')) {
    failures.push(`${path}: a área principal precisa usar limites fixos no mobile.`);
  }
  if (!source.includes('sm:top-[8.5rem]') || !source.includes('md:left-64 md:top-20')) {
    failures.push(`${path}: a área principal não está alinhada à sidebar no desktop.`);
  }
  if (source.includes('pt-16 sm:pt-20')) {
    failures.push(`${path}: espaçamento duplicado do cabeçalho voltou ao fluxo do layout.`);
  }
}

for (const path of portalSidebars) {
  const source = await readFile(path, 'utf8');
  if (!source.includes('fixed bottom-0 left-0 top-16')) {
    failures.push(`${path}: sidebar não começa no mesmo limite do cabeçalho.`);
  }
  if (!source.includes('sm:top-20')) {
    failures.push(`${path}: sidebar não respeita a altura desktop do cabeçalho.`);
  }
  if (!source.includes('h-full') || !source.includes('overflow-y-auto')) {
    failures.push(`${path}: scrollbar da sidebar não ocupa toda a altura disponível.`);
  }
}

const homeSource = await readFile('src/pages/Index.tsx', 'utf8');
if (!homeSource.includes('fixed bottom-0 left-0 right-0 top-16') || !homeSource.includes('sm:top-20')) {
  failures.push('src/pages/Index.tsx: a Home não usa limites fixos imediatamente abaixo do cabeçalho.');
}

const publicSource = await readFile('src/app/layouts/PublicLayout.tsx', 'utf8');
if (!publicSource.includes('fixed bottom-0 left-0 right-0 top-16') || !publicSource.includes('sm:top-20')) {
  failures.push('src/app/layouts/PublicLayout.tsx: páginas públicas não usam limites fixos abaixo do cabeçalho.');
}

const lessonSource = await readFile('src/modules/lessons/pages/Lesson.tsx', 'utf8');
if (!lessonSource.includes('fixed bottom-0 left-0 right-0 top-16 flex overflow-hidden sm:top-20')) {
  failures.push('src/modules/lessons/pages/Lesson.tsx: aula não alinha sidebar e conteúdo no mesmo shell fixo.');
}

const mobileMenuSource = await readFile('src/shared/components/MobileSidebarMenu.tsx', 'utf8');
if (mobileMenuSource.includes('aria-hidden="true"') || mobileMenuSource.includes('h-14 md:hidden')) {
  failures.push('src/shared/components/MobileSidebarMenu.tsx: spacer invisível voltou a deslocar a área principal.');
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

console.log(
  `Cabeçalho fixo e geometria das scrollbars validados em ${fixedHeaderStructures.length} estruturas.`,
);
