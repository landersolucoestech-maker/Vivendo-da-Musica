import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import ProducerSidebar, { PRODUCER_NAV_ITEMS } from '@/shared/components/ProducerSidebar';
import { ROUTES } from '@/shared/constants/routes';

const ProducerLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page h-dvh overflow-hidden">
    <Navigation />
    <MobileSidebarMenu
      sectionLabel="Portal do Produtor"
      items={PRODUCER_NAV_ITEMS}
      exactPath={ROUTES.producer}
    />
    <ProducerSidebar />
    <main
      data-testid="producer-content-scroll"
      className="fixed bottom-0 left-0 right-0 top-[7.5rem] min-w-0 overflow-y-auto overscroll-contain bg-background [scrollbar-gutter:stable] sm:top-[8.5rem] md:left-64 md:top-20"
    >
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </main>
  </div>
);

export default ProducerLayout;
