import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  ref?: Ref<HTMLInputElement>;
}

const Input = ({
  type = 'text',
  placeholder = 'Enter text',
  className,
  'aria-invalid': ariaInvalid,
  ref,
  ...props
}: InputProps) => (
  <input
    ref={ref}
    type={type}
    placeholder={placeholder}
    aria-invalid={ariaInvalid}
    className={cn(
      'w-full rounded border-2 px-4 py-2 shadow-md transition focus:shadow-xs focus:outline-hidden',
      ariaInvalid && 'border-destructive text-destructive shadow-destructive shadow-xs',
      className,
    )}
    {...props}
  />
);

export type { InputProps };
export { Input };
