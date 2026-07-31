import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  icon?: LucideIcon;
}

const StatCard = ({ label, value, delta, icon: Icon }: StatCardProps) => (
  <div className="vdm-surface-interactive relative overflow-hidden p-5">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-brand opacity-75" aria-hidden="true" />
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
        {delta && <p className="mt-2 text-xs font-medium text-primary">{delta}</p>}
      </div>
      {Icon && (
        <span className="vdm-icon-button size-10 border-primary/25 bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      )}
    </div>
  </div>
);

export default StatCard;
