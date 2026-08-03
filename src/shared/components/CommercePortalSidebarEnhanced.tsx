import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import AccountCapabilitySwitcher from '@/modules/auth/components/AccountCapabilitySwitcher';

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface CommercePortalSidebarProps {
  eyebrow: string;
  title: string;
  description: string;
  items: SidebarItem[];
}

const CommercePortalSidebarEnhanced = ({ eyebrow, title, description, items }: CommercePortalSidebarProps) => (
  <aside className="fixed bottom-0 left-0 top-[72px] z-40 hidden w-64 flex-col border-r border-white/8 bg-[#090909] md:flex">
    <div className="border-b border-white/8 p-4">
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 to-transparent p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display text-base font-semibold text-white">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>

    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label={title}>
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href.split('/').filter(Boolean).length === 1}
            className={({ isActive }) => [
              'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary/18 font-semibold text-white ring-1 ring-primary/30'
                : 'text-[#b8b8b8] hover:bg-white/[0.05] hover:text-white',
            ].join(' ')}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>

    <AccountCapabilitySwitcher />
  </aside>
);

export default CommercePortalSidebarEnhanced;
