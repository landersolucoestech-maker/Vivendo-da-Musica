import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) => (
  <div className="rounded-lg border border-border bg-card p-10 text-center flex flex-col items-center gap-3">
    <Icon className="w-8 h-8 text-muted-foreground" />
    <p className="font-medium">{title}</p>
    {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
