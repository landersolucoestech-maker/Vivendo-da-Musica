import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-primary/35 bg-primary/15 text-[#D8B4FE]',
        secondary: 'border-white/10 bg-secondary text-secondary-foreground',
        destructive: 'border-destructive/35 bg-destructive/15 text-red-300',
        success: 'border-success/35 bg-success/15 text-emerald-300',
        warning: 'border-warning/35 bg-warning/15 text-amber-200',
        outline: 'border-white/20 bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
