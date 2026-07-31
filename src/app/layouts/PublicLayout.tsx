import type { ReactNode } from 'react';

import Footer from '@/shared/components/Footer';
import Navigation from '@/shared/components/Navigation';

const PublicLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page min-h-screen overflow-x-hidden bg-background text-foreground">
    <Navigation />
    <main className="relative pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(138,43,226,0.12),transparent_68%)]" />
      <div className="vdm-container relative">{children}</div>
    </main>
    <Footer />
  </div>
);

export default PublicLayout;
