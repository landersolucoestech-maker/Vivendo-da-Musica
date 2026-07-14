import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

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
  <nav className="flex flex-col gap-1">
    {items.map(({ label, to, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === exactPath}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive
              ? 'bg-brand-medium/10 text-brand-medium font-medium'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          }`
        }
      >
        <Icon className="w-4 h-4" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export default SidebarNavList;
