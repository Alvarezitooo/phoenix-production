import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-shadow hover:shadow-emerald-500/10', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-4 flex items-start justify-between', className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn('text-lg font-semibold text-white', className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('text-sm text-white/70', className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
