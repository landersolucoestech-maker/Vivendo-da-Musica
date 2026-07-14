import type { ReactNode } from "react";
import Navigation from "@/shared/components/Navigation";
import AdminSidebar, { ADMIN_NAV_ITEMS } from "@/shared/components/AdminSidebar";
import MobileSidebarMenu from "@/shared/components/MobileSidebarMenu";
import { ROUTES } from "@/shared/constants/routes";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="pt-16">
        <MobileSidebarMenu sectionLabel="Admin" items={ADMIN_NAV_ITEMS} exactPath={ROUTES.admin} />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 min-w-0 px-4 md:px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
