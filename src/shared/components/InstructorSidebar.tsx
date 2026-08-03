import { BarChart3, BookOpen, LayoutDashboard, Users } from 'lucide-react';

import SidebarNavList from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

export const INSTRUCTOR_NAV_ITEMS = [
  { label: 'Visão geral', to: ROUTES.instructor, icon: LayoutDashboard },
  { label: 'Cursos', to: ROUTES.instructorCourses, icon: BookOpen },
  { label: 'Alunos e avaliações', to: ROUTES.instructorAudience, icon: Users },
  { label: 'Relatórios', to: ROUTES.instructorReports, icon: BarChart3 },
];

const InstructorSidebar = () => (
  <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 border-r border-white/10 bg-[#0A0A0A]/95 sm:top-20 md:block">
    <div className="h-full overflow-y-auto px-3 py-6">
      <div className="mb-5 px-3">
        <p className="vdm-eyebrow">Gestão acadêmica</p>
        <p className="mt-1 font-display text-sm font-semibold text-white">Portal do Instrutor</p>
      </div>
      <SidebarNavList items={INSTRUCTOR_NAV_ITEMS} exactPath={ROUTES.instructor} />
    </div>
  </aside>
);

export default InstructorSidebar;
