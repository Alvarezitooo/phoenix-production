import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
