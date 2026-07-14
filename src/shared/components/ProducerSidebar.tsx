import { LayoutDashboard, Music2, Package, ShoppingBag } from "lucide-react";
import SidebarNavList from "@/shared/components/SidebarNavList";
import { ROUTES } from "@/shared/constants/routes";

export const PRODUCER_NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.producer, icon: LayoutDashboard },
  { label: 'Beats e licenças', to: ROUTES.producerBeats, icon: Music2 },
  { label: 'Produtos', to: ROUTES.producerProducts, icon: Package },
  { label: 'Pedidos', to: ROUTES.producerOrders, icon: ShoppingBag },
];

const ProducerSidebar = () => (
  <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:block">
    <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
      <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Produtor/Vendedor</p>
      <SidebarNavList items={PRODUCER_NAV_ITEMS} exactPath={ROUTES.producer} />
    </div>
  </aside>
);

export default ProducerSidebar;
