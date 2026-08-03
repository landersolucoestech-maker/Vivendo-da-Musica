import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Download,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Library,
  LifeBuoy,
  PackageCheck,
  ReceiptText,
  Settings,
  UserRound,
  UsersRound,
} from 'lucide-react';

import CommercePortalSidebar from '@/shared/components/CommercePortalSidebar';

const items = [
  { label: 'Visão geral', href: '/aluno', icon: LayoutDashboard },
  { label: 'Meus cursos', href: '/aluno/meus-cursos', icon: GraduationCap },
  { label: 'Biblioteca', href: '/aluno/biblioteca', icon: Library },
  { label: 'Certificados', href: '/aluno/certificados', icon: BookOpen },
  { label: 'Downloads', href: '/aluno/downloads', icon: Download },
  { label: 'Comunidade', href: '/aluno/comunidade', icon: UsersRound },
  { label: 'Oportunidades', href: '/aluno/oportunidades', icon: BriefcaseBusiness },
  { label: 'Serviços contratados', href: '/aluno/servicos', icon: PackageCheck },
  { label: 'Pedidos', href: '/aluno/pedidos', icon: ReceiptText },
  { label: 'Favoritos', href: '/aluno/favoritos', icon: Heart },
  { label: 'Notificações', href: '/aluno/notificacoes', icon: Bell },
  { label: 'Suporte', href: '/aluno/suporte', icon: LifeBuoy },
  { label: 'Perfil', href: '/aluno/perfil', icon: UserRound },
  { label: 'Configurações', href: '/aluno/configuracoes', icon: Settings },
];

const StudentSidebarCommerce = () => (
  <CommercePortalSidebar
    eyebrow="Vivendo da Música"
    title="Portal do Aluno"
    description="Aprendizado, aquisições, serviços e oportunidades em um único espaço."
    items={items}
  />
);

export default StudentSidebarCommerce;
