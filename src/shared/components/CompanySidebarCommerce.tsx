import { Coins, LayoutDashboard, Mail, Settings, UserSearch, BriefcaseBusiness } from 'lucide-react';

import CommercePortalSidebar from '@/shared/components/CommercePortalSidebar';

const items = [
  { label: 'Visão geral', href: '/empresa', icon: LayoutDashboard },
  { label: 'Oportunidades', href: '/empresa/oportunidades', icon: BriefcaseBusiness },
  { label: 'Créditos de vagas', href: '/empresa/creditos', icon: Coins },
  { label: 'Candidatos', href: '/empresa/candidatos', icon: UserSearch },
  { label: 'Mensagens', href: '/empresa/mensagens', icon: Mail },
  { label: 'Perfil', href: '/empresa/perfil', icon: Settings },
];

const CompanySidebarCommerce = () => (
  <CommercePortalSidebar
    eyebrow="Vivendo da Música"
    title="Portal da Empresa"
    description="Vagas, créditos, candidatos e comunicação com profissionais."
    items={items}
  />
);

export default CompanySidebarCommerce;
