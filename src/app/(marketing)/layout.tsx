import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import type { ReactNode } from 'react';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_60%)]" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 md:pt-16">{children}</main>
      <footer className="border-t border-white/10 bg-black/30 py-8 text-sm text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
          <span className="text-xs uppercase tracking-wide text-white/60">© {new Date().getFullYear()} Phoenix</span>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link className="transition hover:text-white" href="/faq">
              FAQ
            </Link>
            <Link className="transition hover:text-white" href="/mentions-legales">
              Mentions légales
            </Link>
            <Link className="transition hover:text-white" href="/politique-confidentialite">
              Politique de confidentialité
            </Link>
            <a className="transition hover:text-white" href="mailto:support@phoenix-career.fr">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
