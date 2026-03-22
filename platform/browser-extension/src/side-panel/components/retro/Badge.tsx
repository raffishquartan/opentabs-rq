import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const badgeVariants = cva('inline-block rounded font-medium leading-none', {
  variants: {
    variant: {
      default: 'bg-muted text-muted-foreground',
      outline: 'border border-current bg-transparent',
    },
    size: {
      sm: 'px-1 py-0.5 text-[9px]',
      md: 'px-1.5 py-0.5 text-[10px]',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

interface IBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, size, ...props }: IBadgeProps) => (
  <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
);
Badge.displayName = 'Badge';

export type { IBadgeProps };
export { Badge, badgeVariants };
