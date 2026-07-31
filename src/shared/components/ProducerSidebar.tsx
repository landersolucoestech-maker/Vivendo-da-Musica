import { LayoutDashboard, Music2, Package, ShoppingBag } from 'lucide-react';

import SidebarNavList from '@/shared/components/SidebarNavList';
import { ROUTES } from '@/shared/constants/routes';

export const PRODUCER_NAV_ITEMS = [
  { label: 'Visão geral', to: ROUTES.producer, icon: LayoutDashboard },
  { label: 'Beats e licenças', to: ROUTES.producerBeats, icon: Music2 },
  { label: 'Produtos digitais', to: ROUTES.producerProducts, icon: Package },
  { label: 'Pedidos', to: ROUTES.producerOrders, icon: ShoppingBag },
];

const ProducerSidebar = () => (
  <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-white/10 bg-[#0A0A0A]/95 md:block">
    <div className="h-full overflow-y-auto px-3 py-6">
      <div className="mb-5 px-3">
        <p className="vdm-eyebrow">Marketplace</p>
        <p className="mt-1 font-display text-sm font-semibold text-white">Portal do Produtor</p>
      </div>
      <SidebarNavList items={PRODUCER_NAV_ITEMS} exactPath={ROUTES.producer} />
    </div>
  </aside>
);

export default ProducerSidebar;
