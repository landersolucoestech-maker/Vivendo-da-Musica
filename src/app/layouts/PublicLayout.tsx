import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import Footer from '@/shared/components/Footer';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const isLegalDocument = pathname === ROUTES.privacyPolicy || pathname === ROUTES.termsOfUse;

  return (
    <div className="vdm-page min-h-screen overflow-x-clip bg-background text-foreground">
      <Navigation />
      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(138,43,226,0.12),transparent_68%)]" />
        <div className={`vdm-container relative ${isLegalDocument ? '!max-w-[1760px]' : ''}`}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
