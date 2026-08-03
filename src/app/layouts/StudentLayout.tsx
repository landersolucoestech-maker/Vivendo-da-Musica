import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import StudentSidebar, { STUDENT_NAV_ITEMS } from '@/shared/components/StudentSidebar';
import { ROUTES } from '@/shared/constants/routes';

const StudentLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="vdm-page min-h-screen overflow-x-hidden bg-[#070707]">
      <Navigation />
      <div className="pt-16 sm:pt-20">
        <MobileSidebarMenu
          sectionLabel="Portal do Aluno"
          items={STUDENT_NAV_ITEMS}
          exactPath={ROUTES.dashboard}
        />
        <StudentSidebar />
        <main className="min-h-[calc(100dvh-4rem)] min-w-0 w-full px-4 pb-14 pt-5 sm:min-h-[calc(100dvh-5rem)] sm:px-6 md:ml-64 md:w-[calc(100%-16rem)] lg:px-8 lg:pt-7 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
