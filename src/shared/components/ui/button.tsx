import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-brand text-white shadow-brand hover:-translate-y-0.5 hover:brightness-110 hover:shadow-brand-lg active:translate-y-0',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/88',
        outline:
          'border border-white/25 bg-transparent text-white hover:border-primary hover:bg-primary/10 hover:text-white',
        secondary:
          'border border-white/10 bg-secondary text-secondary-foreground hover:border-primary/45 hover:bg-primary/10',
        ghost:
          'text-muted-foreground hover:bg-primary/12 hover:text-white',
        link: 'h-auto rounded-none px-0 text-primary underline-offset-4 hover:text-[#A65AF0] hover:underline',
        success:
          'bg-success text-success-foreground shadow-sm hover:bg-success/88',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-7 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
