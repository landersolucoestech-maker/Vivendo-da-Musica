import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Download,
  Heart,
  LayoutDashboard,
  Library,
  LifeBuoy,
  Settings,
  ShoppingBag,
  UserCog,
  Users,
} from 'lucide-react';

import SidebarNavList from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

export const STUDENT_NAV_ITEMS = [
  { label: 'Visão geral', to: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Meus cursos', to: ROUTES.myCourses, icon: BookOpen },
  { label: 'Biblioteca', to: ROUTES.premiumLibrary, icon: Library },
  { label: 'Certificados', to: ROUTES.certificates, icon: Award },
  { label: 'Downloads', to: ROUTES.downloads, icon: Download },
  { label: 'Comunidade', to: ROUTES.community, icon: Users },
  { label: 'Oportunidades', to: ROUTES.opportunities, icon: Briefcase },
  { label: 'Pedidos', to: ROUTES.orders, icon: ShoppingBag },
  { label: 'Favoritos', to: ROUTES.favorites, icon: Heart },
  { label: 'Notificações', to: ROUTES.notifications, icon: Bell },
  { label: 'Suporte', to: ROUTES.support, icon: LifeBuoy },
  { label: 'Perfil', to: ROUTES.editProfile, icon: UserCog },
  { label: 'Configurações', to: ROUTES.settings, icon: Settings },
];

const StudentSidebar = () => (
  <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-white/10 bg-[#0A0A0A]/95 md:block">
    <div className="h-full overflow-y-auto px-3 py-6">
      <div className="mb-5 px-3">
        <p className="vdm-eyebrow">Vivendo da Música</p>
        <p className="mt-1 font-display text-sm font-semibold text-white">Portal do Aluno</p>
      </div>
      <SidebarNavList items={STUDENT_NAV_ITEMS} exactPath={ROUTES.dashboard} />
    </div>
  </aside>
);

export default StudentSidebar;
