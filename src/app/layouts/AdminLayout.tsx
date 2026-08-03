import type { ReactNode } from 'react';

import AdminSidebar, { ADMIN_NAV_ITEMS } from '@/shared/components/AdminSidebar';
import MobileSidebarMenu from '@/shared/components/MobileSidebarMenu';
import Navigation from '@/shared/components/Navigation';
import { ROUTES } from '@/shared/constants/routes';

const AdminLayout = ({ children }: { children: ReactNode }) => (
  <div className="vdm-page min-h-screen overflow-x-hidden">
    <Navigation />
    <div className="pt-16 sm:pt-20">
      <MobileSidebarMenu sectionLabel="Administração" items={ADMIN_NAV_ITEMS} exactPath={ROUTES.admin} />
      <AdminSidebar />
      <main className="min-h-[calc(100dvh-4rem)] min-w-0 w-full px-4 py-6 sm:min-h-[calc(100dvh-5rem)] sm:px-6 md:ml-64 md:w-[calc(100%-16rem)] lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  </div>
);

export default AdminLayout;
