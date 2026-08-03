import type { ReactNode } from 'react';

import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import StudentSidebar, { STUDENT_NAV_ITEMS } from '@/shared/components/StudentSidebar';
import { ROUTES } from '@/shared/constants/routes';

const StudentLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="vdm-page min-h-screen overflow-x-hidden bg-[#070707]">
      <Navigation />
      <div className="pt-16">
        <MobileSidebarMenu
          sectionLabel="Portal do Aluno"
          items={STUDENT_NAV_ITEMS}
          exactPath={ROUTES.dashboard}
        />
        <div className="mx-auto flex w-full max-w-[1720px]">
          <StudentSidebar />
          <main className="min-w-0 flex-1 px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-7 xl:px-10">
            <div className="mx-auto w-full max-w-[1380px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;
