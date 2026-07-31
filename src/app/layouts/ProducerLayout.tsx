import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import ProducerSidebar, { PRODUCER_NAV_ITEMS } from '@/shared/components/ProducerSidebar';
import { ROUTES } from '@/shared/constants/routes';

const ProducerLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page min-h-screen overflow-x-hidden">
    <Navigation />
    <div className="pt-16">
      <MobileSidebarMenu
        sectionLabel="Portal do Produtor"
        items={PRODUCER_NAV_ITEMS}
        exactPath={ROUTES.producer}
      />
      <div className="mx-auto flex w-full max-w-[1920px]">
        <ProducerSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  </div>
);

export default ProducerLayout;
