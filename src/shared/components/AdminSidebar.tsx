import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Plug,
  ScrollText,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';

import SidebarNavList from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

export const ADMIN_NAV_ITEMS = [
  { label: 'Visão geral', to: ROUTES.admin, icon: LayoutDashboard },
  { label: 'Usuários', to: ROUTES.adminUsers, icon: Users },
  { label: 'Alunos', to: ROUTES.adminStudents, icon: GraduationCap },
  { label: 'Cursos', to: ROUTES.adminCourses, icon: BookOpen },
  { label: 'Produtos', to: ROUTES.adminProducts, icon: ShoppingBag },
  { label: 'Pedidos', to: ROUTES.adminOrders, icon: ClipboardList },
  { label: 'Assinaturas', to: ROUTES.adminSubscriptions, icon: CreditCard },
  { label: 'Cupons', to: ROUTES.adminCoupons, icon: Ticket },
  { label: 'Conteúdos', to: ROUTES.adminContent, icon: FileText },
  { label: 'Certificados', to: ROUTES.adminCertificates, icon: Award },
  { label: 'Comunidade', to: ROUTES.adminCommunity, icon: MessageSquare },
  { label: 'Relatórios', to: ROUTES.adminReports, icon: BarChart3 },
  { label: 'Observabilidade', to: ROUTES.adminObservability, icon: Activity },
  { label: 'Integrações', to: ROUTES.adminIntegrations, icon: Plug },
  { label: 'Financeiro', to: ROUTES.adminFinance, icon: Wallet },
  { label: 'Marketing', to: ROUTES.adminMarketing, icon: Megaphone },
  { label: 'Suporte', to: ROUTES.adminSupport, icon: LifeBuoy },
  { label: 'Auditoria', to: ROUTES.adminAudit, icon: ScrollText },
  { label: 'Segurança', to: ROUTES.adminSecurity, icon: ShieldAlert },
  { label: 'Configurações', to: ROUTES.adminSettings, icon: Settings },
];

const AdminSidebar = () => (
  <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-white/10 bg-[#0A0A0A]/95 md:block">
    <div className="h-full overflow-y-auto px-3 py-6">
      <div className="mb-5 px-3">
        <p className="vdm-eyebrow">Gestão da plataforma</p>
        <p className="mt-1 font-display text-sm font-semibold text-white">Administração</p>
      </div>
      <SidebarNavList items={ADMIN_NAV_ITEMS} exactPath={ROUTES.admin} />
    </div>
  </aside>
);

export default AdminSidebar;
