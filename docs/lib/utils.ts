import { clsx } from 'clsx';
import type { ClassNameValue } from 'tailwind-merge';
import { twMerge } from 'tailwind-merge';

export const cn = (...classes: ClassNameValue[]) => twMerge(clsx(classes));
