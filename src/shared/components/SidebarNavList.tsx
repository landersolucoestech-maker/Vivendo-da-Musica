import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export interface SidebarNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface SidebarNavListProps {
  items: SidebarNavItem[];
  exactPath?: string;
  onNavigate?: () => void;
}

const SidebarNavList = ({ items, exactPath, onNavigate }: SidebarNavListProps) => (
  <nav className="flex flex-col gap-1" aria-label="Navegação do portal">
    {items.map(({ label, to, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === exactPath}
        onClick={onNavigate}
        className={({ isActive }) =>
          `group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200 ${
            isActive
              ? 'bg-primary/15 text-white shadow-[inset_3px_0_0_#8A2BE2]'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`size-4 shrink-0 transition ${
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
              }`}
            />
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

export default SidebarNavList;
