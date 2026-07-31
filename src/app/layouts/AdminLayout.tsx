import type { ReactNode } from 'react';

import AdminSidebar, { ADMIN_NAV_ITEMS } from '@/shared/components/AdminSidebar';
import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const AdminLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page min-h-screen overflow-x-hidden">
    <Navigation />
    <div className="pt-16">
      <MobileSidebarMenu sectionLabel="Administração" items={ADMIN_NAV_ITEMS} exactPath={ROUTES.admin} />
      <div className="mx-auto flex w-full max-w-[1920px]">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  </div>
);

export default AdminLayout;
