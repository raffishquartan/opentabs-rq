import { cn } from '../../lib/cn';
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const badgeVariants = cva('inline-flex items-center rounded font-semibold', {
  variants: {
    variant: {
      default: 'bg-muted text-muted-foreground',
      outline: 'border-2 border-foreground text-foreground',
      solid: 'bg-foreground text-background',
      surface: 'border-2 bg-primary text-primary-foreground',
    },
    size: {
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-1.5 text-sm',
      lg: 'px-3 py-2 text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface IBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, IBadgeProps>(
  ({ size = 'md', variant = 'default', className, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  ),
);

Badge.displayName = 'Badge';

export { badgeVariants, Badge };
export type { IBadgeProps };
