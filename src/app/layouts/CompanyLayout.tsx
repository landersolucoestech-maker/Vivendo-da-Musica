import type { ReactNode } from 'react';

import CompanySidebar, { COMPANY_NAV_ITEMS } from '@/shared/components/CompanySidebar';
import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const CompanyLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page min-h-screen overflow-x-hidden">
    <Navigation />
    <div className="pt-16">
      <MobileSidebarMenu
        sectionLabel="Portal da Empresa"
        items={COMPANY_NAV_ITEMS}
        exactPath={ROUTES.company}
      />
      <div className="mx-auto flex w-full max-w-[1920px]">
        <CompanySidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  </div>
);

export default CompanyLayout;
