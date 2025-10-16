'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export type ToastOptions = {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

export type ToastHandle = ToastOptions & {
  id: string;
  createdAt: number;
};

type ToastContextValue = {
  toasts: ToastHandle[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'border-white/20 bg-slate-900/90 text-white',
  success: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100',
  error: 'border-rose-500/50 bg-rose-500/15 text-rose-100',
  info: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-100',
};

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastHandle[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timerId = timers.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ id, variant = 'default', duration = 5000, ...rest }: ToastOptions) => {
      const toastId = id ?? generateId();
      const handle: ToastHandle = {
        id: toastId,
        variant,
        duration,
        createdAt: Date.now(),
        ...rest,
      };

      setToasts((current) => {
        const next = current.filter((toast) => toast.id !== toastId);
        return [...next, handle];
      });

      if (duration > 0 && typeof window !== 'undefined') {
        const timeout = window.setTimeout(() => dismissToast(toastId), duration);
        timers.current.set(toastId, timeout);
      }

      return toastId;
    },
    [dismissToast],
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timeout) => window.clearTimeout(timeout));
      timersMap.clear();
    };
  }, []);

  const contextValue = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <aside
        className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-1/2 z-[60] flex w-[min(100vw-3rem,22rem)] -translate-x-1/2 flex-col items-stretch gap-3 sm:left-auto sm:right-6 sm:w-auto sm:translate-x-0 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex flex-col gap-1 rounded-2xl border px-4 py-3 shadow-lg shadow-slate-950/40 backdrop-blur',
              VARIANT_STYLES[toast.variant ?? 'default'],
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-tight">{toast.title}</p>
                {toast.description && <p className="text-xs text-white/70">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast(): Pick<ToastContextValue, 'showToast' | 'dismissToast'> {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    showToast: context.showToast,
    dismissToast: context.dismissToast,
  };
}
