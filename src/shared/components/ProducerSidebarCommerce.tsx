import { BriefcaseBusiness, Disc3, LayoutDashboard, Package, ReceiptText } from 'lucide-react';

import CommercePortalSidebar from '@/shared/components/CommercePortalSidebar';

const items = [
  { label: 'Visão geral', href: '/produtor', icon: LayoutDashboard },
  { label: 'Beats', href: '/produtor/beats', icon: Disc3 },
  { label: 'Produtos', href: '/produtor/produtos', icon: Package },
  { label: 'Pedidos', href: '/produtor/pedidos', icon: ReceiptText },
  { label: 'Serviços', href: '/produtor/servicos', icon: BriefcaseBusiness },
];

const ProducerSidebarCommerce = () => (
  <CommercePortalSidebar
    eyebrow="Vivendo da Música"
    title="Portal do Produtor"
    description="Produtos, beats, serviços, pedidos e resultados da sua operação."
    items={items}
  />
);

export default ProducerSidebarCommerce;
