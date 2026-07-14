import type { ReactNode } from "react";
import MobileSidebarMenu from "@/shared/components/MobileSidebarMenu";
import Navigation from "@/shared/components/Navigation";
import ProducerSidebar, { PRODUCER_NAV_ITEMS } from "@/shared/components/ProducerSidebar";
import { ROUTES } from "@/shared/constants/routes";

const ProducerLayout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <Navigation />
    <div className="pt-16">
      <MobileSidebarMenu sectionLabel="Produtor/Vendedor" items={PRODUCER_NAV_ITEMS} exactPath={ROUTES.producer} />
      <div className="flex">
        <ProducerSidebar />
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  </div>
);

export default ProducerLayout;
