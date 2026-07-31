import * as React from 'react';

import { cn } from '@/shared/utils/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-lg border border-white/15 bg-[#121212] px-3.5 py-2 text-base text-white shadow-sm ring-offset-background transition file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-white placeholder:text-white/38 hover:border-white/25 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
