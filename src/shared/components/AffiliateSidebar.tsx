import { BadgeDollarSign, BarChart3, LayoutDashboard, Link2, PackageOpen, UserRound, WalletCards } from 'lucide-react';

import SidebarNavList from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

export const AFFILIATE_NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.affiliate, icon: LayoutDashboard },
  { label: 'Links', to: ROUTES.affiliateLinks, icon: Link2 },
  { label: 'Conversões', to: ROUTES.affiliateConversions, icon: BarChart3 },
  { label: 'Comissões', to: ROUTES.affiliateCommissions, icon: BadgeDollarSign },
  { label: 'Saques', to: ROUTES.affiliateWithdrawals, icon: WalletCards },
  { label: 'Materiais', to: ROUTES.affiliateMaterials, icon: PackageOpen },
  { label: 'Perfil', to: ROUTES.affiliateProfile, icon: UserRound },
];

const AffiliateSidebar = () => (
  <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar sm:top-20 md:block">
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 border-b border-white/8 px-3 pb-4">
        <p className="vdm-eyebrow">Portal do afiliado</p>
        <p className="mt-1 text-sm text-muted-foreground">Links, resultados e comissões</p>
      </div>
      <SidebarNavList items={AFFILIATE_NAV_ITEMS} exactPath={ROUTES.affiliate} />
    </div>
  </aside>
);

export default AffiliateSidebar;
