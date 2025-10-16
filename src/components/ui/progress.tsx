import { cn } from '@/utils/cn';

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-purple-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
