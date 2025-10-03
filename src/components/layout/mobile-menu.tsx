'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/sign-out-button';

export type HeaderNavItem = {
  href: string;
  label: string;
};

type MobileMenuProps = {
  navItems: HeaderNavItem[];
  isAuthenticated: boolean;
};

export function MobileMenu({ navItems, isAuthenticated }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la navigation"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-sm flex-col gap-6 px-6 py-8">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-semibold uppercase tracking-widest text-white/60">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer la navigation"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-3 text-lg font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-emerald-400/60 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="space-y-3 text-sm text-white/80">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
                  >
                    Accéder au tableau de bord
                  </Link>
                  <SignOutButton />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/auth/sign-in"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-5 py-2 font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
                  >
                    Créer un compte
                  </Link>
                </div>
              )}
              <p className="text-xs text-white/50">
                Support&nbsp;: <a href="mailto:support@phoenix-career.fr" className="text-emerald-200 hover:text-emerald-100">support@phoenix-career.fr</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
