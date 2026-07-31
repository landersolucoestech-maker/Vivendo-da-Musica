import type { ReactNode } from 'react';

import AffiliateSidebar, { AFFILIATE_NAV_ITEMS } from '@/shared/components/AffiliateSidebar';
import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const AffiliateLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page">
    <Navigation />
    <div className="pt-16">
      <MobileSidebarMenu sectionLabel="Portal do Afiliado" items={AFFILIATE_NAV_ITEMS} exactPath={ROUTES.affiliate} />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AffiliateSidebar />
        <main className="min-w-0 flex-1">
          <div className="vdm-container">{children}</div>
        </main>
      </div>
    </div>
  </div>
);

export default AffiliateLayout;
