import type { ReactNode } from 'react';

import InstructorSidebar, { INSTRUCTOR_NAV_ITEMS } from '@/shared/components/InstructorSidebar';
import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const InstructorLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page h-dvh overflow-hidden">
    <Navigation />
    <MobileSidebarMenu
      sectionLabel="Portal do Instrutor"
      items={INSTRUCTOR_NAV_ITEMS}
      exactPath={ROUTES.instructor}
    />
    <InstructorSidebar />
    <main
      data-testid="instructor-content-scroll"
      className="fixed bottom-0 left-0 right-0 top-[7.5rem] min-w-0 overflow-y-auto overscroll-contain bg-background [scrollbar-gutter:stable] sm:top-[8.5rem] md:left-64 md:top-20"
    >
      <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </main>
  </div>
);

export default InstructorLayout;
