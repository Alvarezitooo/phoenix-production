'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-[1.01]',
  secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/15',
  ghost: 'bg-transparent text-white/80 hover:text-white hover:bg-white/10',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseClasses, variantClasses[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
