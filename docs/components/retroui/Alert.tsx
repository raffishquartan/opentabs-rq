import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { HtmlHTMLAttributes } from 'react';
import { Text } from '@/components/retroui/Text';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-(--radius) border-2 p-4', {
  variants: {
    variant: {
      default: 'bg-background text-foreground [&_svg]:shrink-0',
      solid: 'bg-foreground text-background',
    },
    status: {
      error: 'bg-destructive text-destructive-foreground border-destructive',
      success: 'bg-accent text-accent-foreground border-accent-foreground',
      warning: 'bg-primary text-primary-foreground border-primary-foreground',
      info: 'bg-secondary text-secondary-foreground border-secondary-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type IAlertProps = HtmlHTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

const Alert = ({ className, variant, status, ...props }: IAlertProps) => (
  <div role="alert" className={cn(alertVariants({ variant, status }), className)} {...props} />
);
Alert.displayName = 'Alert';

const AlertTitle = ({ className, ...props }: HtmlHTMLAttributes<HTMLHeadingElement>) => (
  <Text as="h5" className={cn(className)} {...props} />
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = ({ className, ...props }: HtmlHTMLAttributes<HTMLParagraphElement>) => (
  <div className={cn('text-muted-foreground', className)} {...props} />
);
AlertDescription.displayName = 'AlertDescription';

const AlertComponent = Object.assign(Alert, {
  Title: AlertTitle,
  Description: AlertDescription,
});

export { AlertComponent as Alert };
