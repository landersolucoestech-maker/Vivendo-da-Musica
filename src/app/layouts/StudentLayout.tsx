import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import StudentSidebar, { STUDENT_NAV_ITEMS } from '@/shared/components/StudentSidebar';
import { ROUTES } from '@/shared/constants/routes';

const StudentLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="vdm-page h-dvh overflow-hidden bg-[#070707]">
      <Navigation />
      <div className="flex h-full flex-col overflow-hidden pt-16 sm:pt-20">
        <MobileSidebarMenu
          sectionLabel="Portal do Aluno"
          items={STUDENT_NAV_ITEMS}
          exactPath={ROUTES.dashboard}
        />
        <StudentSidebar />
        <main
          data-testid="student-content-scroll"
          className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] md:ml-64 md:w-[calc(100%-16rem)]"
        >
          <div className="min-h-full px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-7 xl:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
