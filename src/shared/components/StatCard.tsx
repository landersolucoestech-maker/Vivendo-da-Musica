import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  icon?: LucideIcon;
}

const StatCard = ({ label, value, delta, icon: Icon }: StatCardProps) => (
  <div className="rounded-lg border border-border bg-card p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{label}</p>
      {Icon && <Icon className="w-4 h-4 text-brand-medium" />}
    </div>
    <p className="text-2xl font-bold mt-1">{value}</p>
    {delta && <p className="text-xs text-brand-medium mt-1">{delta}</p>}
  </div>
);

export default StatCard;
