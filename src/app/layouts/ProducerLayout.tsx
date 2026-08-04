import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import ProducerSidebar, { PRODUCER_NAV_ITEMS } from '@/shared/components/ProducerSidebar';
import { ROUTES } from '@/shared/constants/routes';

const ProducerLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page h-dvh overflow-hidden">
    <Navigation />
    <div className="flex h-full flex-col overflow-hidden pt-16 sm:pt-20">
      <MobileSidebarMenu
        sectionLabel="Portal do Produtor"
        items={PRODUCER_NAV_ITEMS}
        exactPath={ROUTES.producer}
      />
      <ProducerSidebar />
      <main
        data-testid="producer-content-scroll"
        className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-4 py-6 sm:px-6 md:ml-64 md:w-[calc(100%-16rem)] lg:px-8 lg:py-8"
      >
        {children}
      </main>
    </div>
  </div>
);

export default ProducerLayout;
