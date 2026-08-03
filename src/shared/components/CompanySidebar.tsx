import { BriefcaseBusiness, Building2, Coins, LayoutDashboard, MessageSquareText, UsersRound } from 'lucide-react';

import SidebarNavList from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

export const COMPANY_NAV_ITEMS = [
  { label: 'Visão geral', to: ROUTES.company, icon: LayoutDashboard },
  { label: 'Oportunidades', to: ROUTES.companyOpportunities, icon: BriefcaseBusiness },
  { label: 'Créditos de vagas', to: ROUTES.companyCredits, icon: Coins },
  { label: 'Candidatos', to: ROUTES.companyCandidates, icon: UsersRound },
  { label: 'Mensagens', to: ROUTES.companyMessages, icon: MessageSquareText },
  { label: 'Perfil da empresa', to: ROUTES.companyProfile, icon: Building2 },
];

const CompanySidebar = () => (
  <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 border-r border-white/10 bg-[#0A0A0A]/95 sm:top-20 md:block">
    <div className="h-full overflow-y-auto px-3 py-6">
      <div className="mb-5 px-3">
        <p className="vdm-eyebrow">Recrutamento</p>
        <p className="mt-1 font-display text-sm font-semibold text-white">Portal da Empresa</p>
      </div>
      <SidebarNavList items={COMPANY_NAV_ITEMS} exactPath={ROUTES.company} />
    </div>
  </aside>
);

export default CompanySidebar;
