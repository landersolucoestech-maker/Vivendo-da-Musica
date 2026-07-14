import { BarChart3, BookOpen, LayoutDashboard, Users } from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import SidebarNavList from "@/shared/components/SidebarNavList";

export const INSTRUCTOR_NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.instructor, icon: LayoutDashboard },
  { label: 'Cursos', to: ROUTES.instructorCourses, icon: BookOpen },
  { label: 'Alunos e avaliações', to: ROUTES.instructorAudience, icon: Users },
  { label: 'Receita e relatórios', to: ROUTES.instructorReports, icon: BarChart3 },
];

const InstructorSidebar = () => (
  <aside className="w-60 shrink-0 border-r border-border bg-background hidden md:block">
    <div className="p-4 sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
      <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">Instrutor</p>
      <SidebarNavList items={INSTRUCTOR_NAV_ITEMS} exactPath={ROUTES.instructor} />
    </div>
  </aside>
);

export default InstructorSidebar;
