import type { ReactNode } from "react";
import Navigation from "@/shared/components/Navigation";
import StudentSidebar, { STUDENT_NAV_ITEMS } from "@/shared/components/StudentSidebar";
import MobileSidebarMenu from "@/shared/components/MobileSidebarMenu";
import { ROUTES } from "@/shared/constants/routes";

const StudentLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="pt-16">
        <MobileSidebarMenu sectionLabel="Área do Aluno" items={STUDENT_NAV_ITEMS} exactPath={ROUTES.dashboard} />
        <div className="flex">
          <StudentSidebar />
          <main className="flex-1 min-w-0 px-4 md:px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;
