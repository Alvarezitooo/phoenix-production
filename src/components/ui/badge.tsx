import { cn } from '@/utils/cn';

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80', className)}>{children}</span>;
}

const scoreVariants = [
  { threshold: 80, classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { threshold: 60, classes: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50' },
  { threshold: 0, classes: 'bg-purple-500/20 text-purple-200 border-purple-500/50' },
];

export function CompatibilityBadge({ value }: { value: number }) {
  const variant = scoreVariants.find((item) => value >= item.threshold) ?? scoreVariants.at(-1)!;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', variant.classes)}>
      {value}% match
    </span>
  );
}
