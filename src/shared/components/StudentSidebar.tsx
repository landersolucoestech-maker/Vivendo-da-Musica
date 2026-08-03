import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  BriefcaseBusiness,
  ClipboardList,
  Download,
  Heart,
  LayoutDashboard,
  Library,
  LifeBuoy,
  Settings,
  ShoppingBag,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import SidebarNavList, { type SidebarNavItem } from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

const LEARNING_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Visão geral', to: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Meus cursos', to: ROUTES.myCourses, icon: BookOpen },
  { label: 'Biblioteca', to: ROUTES.library, icon: Library },
  { label: 'Certificados', to: ROUTES.certificates, icon: Award },
];

const DISCOVERY_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Downloads', to: ROUTES.downloads, icon: Download },
  { label: 'Solicitações de serviço', to: ROUTES.studentServiceRequests, icon: ClipboardList },
  { label: 'Serviços contratados', to: ROUTES.studentServices, icon: BriefcaseBusiness },
  { label: 'Comunidade', to: ROUTES.community, icon: Users },
  { label: 'Oportunidades', to: ROUTES.opportunities, icon: Briefcase },
];

const ACCOUNT_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Pedidos', to: ROUTES.orders, icon: ShoppingBag },
  { label: 'Favoritos', to: ROUTES.favorites, icon: Heart },
  { label: 'Notificações', to: ROUTES.notifications, icon: Bell },
  { label: 'Suporte', to: ROUTES.support, icon: LifeBuoy },
  { label: 'Perfil', to: ROUTES.editProfile, icon: UserCog },
  { label: 'Configurações', to: ROUTES.settings, icon: Settings },
];

export const STUDENT_NAV_ITEMS = [
  ...LEARNING_NAV_ITEMS,
  ...DISCOVERY_NAV_ITEMS,
  ...ACCOUNT_NAV_ITEMS,
];

const SidebarSection = ({ label, items }: { label: string; items: SidebarNavItem[] }) => (
  <section className="space-y-2">
    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{label}</p>
    <SidebarNavList items={items} exactPath={ROUTES.dashboard} />
  </section>
);

const StudentSidebar = () => (
  <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 border-r border-white/8 bg-[#090909]/95 sm:top-20 md:block">
    <div className="flex h-full flex-col overflow-y-auto px-4 py-5">
      <div className="mb-7 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Vivendo da Música</p>
            <p className="mt-1 truncate font-display text-sm font-semibold text-white">Portal do Aluno</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Aprendizado, materiais e evolução em um único espaço.
        </p>
      </div>

      <div className="space-y-6">
        <SidebarSection label="Aprendizado" items={LEARNING_NAV_ITEMS} />
        <SidebarSection label="Explorar" items={DISCOVERY_NAV_ITEMS} />
        <SidebarSection label="Minha conta" items={ACCOUNT_NAV_ITEMS} />
      </div>

      <div className="mt-auto pt-6">
        <Link
          to={ROUTES.academy}
          className="group block rounded-2xl border border-white/8 bg-white/[0.025] p-4 transition hover:border-primary/35 hover:bg-primary/[0.07]"
        >
          <p className="text-xs font-semibold text-white">Explore novos cursos</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Amplie sua trilha de aprendizado.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition group-hover:gap-2">
            Abrir Academia
            <span aria-hidden="true">→</span>
          </span>
        </Link>
      </div>
    </div>
  </aside>
);

export default StudentSidebar;
