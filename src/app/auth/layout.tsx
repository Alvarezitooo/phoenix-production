import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-900 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
