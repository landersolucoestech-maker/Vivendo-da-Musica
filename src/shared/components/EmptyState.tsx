import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-10 text-center">
    <Icon className="size-8 text-muted-foreground" />
    <p className="font-medium">{title}</p>
    {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action ?? (actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null)}
  </div>
);

export default EmptyState;
