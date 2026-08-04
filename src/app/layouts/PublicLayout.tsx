import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import Footer from '@/shared/components/Footer';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const isLegalDocument = pathname === ROUTES.privacyPolicy || pathname === ROUTES.termsOfUse;

  return (
    <div className="vdm-page h-dvh overflow-hidden bg-background text-foreground">
      <Navigation />
      <div className="h-full pt-16 sm:pt-20">
        <div
          data-testid="public-content-scroll"
          className="h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        >
          <main className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(138,43,226,0.12),transparent_68%)]" />
            <div className={`vdm-container relative ${isLegalDocument ? '!max-w-[1760px]' : ''}`}>
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default PublicLayout;
