import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import StudentSidebar, { STUDENT_NAV_ITEMS } from '@/shared/components/StudentSidebar';
import { ROUTES } from '@/shared/constants/routes';

const StudentLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="vdm-page h-dvh overflow-hidden bg-[#070707]">
      <Navigation />
      <MobileSidebarMenu
        sectionLabel="Portal do Aluno"
        items={STUDENT_NAV_ITEMS}
        exactPath={ROUTES.dashboard}
      />
      <StudentSidebar />
      <main
        data-testid="student-content-scroll"
        className="fixed bottom-0 left-0 right-0 top-[7.5rem] min-w-0 overflow-y-auto overscroll-contain bg-[#070707] [scrollbar-gutter:stable] sm:top-[8.5rem] md:left-64 md:top-20"
      >
        <div className="min-h-full px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-7 xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default StudentLayout;
