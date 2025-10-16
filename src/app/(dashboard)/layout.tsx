import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { LunaSidebar } from '@/components/luna/luna-sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { EnergyToastWatcher } from '@/components/energy/energy-toast-watcher';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_70%)]" />
      <SiteHeader />
      <EnergyToastWatcher />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 md:pt-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)]">{children}</div>
      </main>
      <LunaSidebar />
      <BottomNav />
    </div>
  );
}
