import type { ReactNode } from 'react';

import AffiliateSidebar, { AFFILIATE_NAV_ITEMS } from '@/shared/components/AffiliateSidebar';
import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const AffiliateLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page h-dvh overflow-hidden">
    <Navigation />
    <div className="flex h-full flex-col overflow-hidden pt-16 sm:pt-20">
      <MobileSidebarMenu sectionLabel="Portal do Afiliado" items={AFFILIATE_NAV_ITEMS} exactPath={ROUTES.affiliate} />
      <AffiliateSidebar />
      <main
        data-testid="affiliate-content-scroll"
        className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] md:ml-64 md:w-[calc(100%-16rem)]"
      >
        <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  </div>
);

export default AffiliateLayout;
