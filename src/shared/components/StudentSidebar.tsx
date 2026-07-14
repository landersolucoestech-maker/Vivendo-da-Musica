import {
  LayoutDashboard, BookOpen, Award, Download, Library,
  CalendarDays, Users, Briefcase, ShoppingBag, Heart, Bell, LifeBuoy, UserCog, Settings,
} from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import SidebarNavList from "@/shared/components/SidebarNavList";

export const STUDENT_NAV_ITEMS = [
  { label: 'Visão Geral', to: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Meus Cursos', to: ROUTES.myCourses, icon: BookOpen },
  { label: 'Certificados', to: ROUTES.certificates, icon: Award },
  { label: 'Downloads', to: ROUTES.downloads, icon: Download },
  { label: 'Biblioteca Premium', to: ROUTES.premiumLibrary, icon: Library },
  { label: 'Eventos', to: ROUTES.events, icon: CalendarDays },
  { label: 'Comunidade', to: ROUTES.community, icon: Users },
  { label: 'Oportunidades', to: ROUTES.opportunities, icon: Briefcase },
  { label: 'Pedidos', to: ROUTES.orders, icon: ShoppingBag },
  { label: 'Favoritos', to: ROUTES.favorites, icon: Heart },
  { label: 'Notificações', to: ROUTES.notifications, icon: Bell },
  { label: 'Suporte', to: ROUTES.support, icon: LifeBuoy },
  { label: 'Perfil', to: ROUTES.editProfile, icon: UserCog },
  { label: 'Configurações', to: ROUTES.settings, icon: Settings },
];

const StudentSidebar = () => {
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-background hidden md:block">
      <div className="p-4 sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">Área do Aluno</p>
        <SidebarNavList items={STUDENT_NAV_ITEMS} exactPath={ROUTES.dashboard} />
      </div>
    </aside>
  );
};

export default StudentSidebar;
