"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { Rocket } from 'lucide-react';
import { MobileMenu, type HeaderNavItem } from '@/components/layout/mobile-menu';

const navItems: HeaderNavItem[] = [
  { href: '/luna', label: 'Luna – Coach IA' },
  { href: '/aube', label: 'Aube – Découverte' },
  { href: '/cv-builder', label: 'Créateur de CV' },
  { href: '/letters', label: 'Studio Lettres' },
  { href: '/rise', label: 'Rise – Entretiens' },
  { href: '/pricing', label: 'Offres & tarifs' },
];

export function SiteHeader() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 text-white shadow-lg">
              <Rocket className="h-5 w-5" />
            </span>
            Phoenix
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/60 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <SignOutButton />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
              >
                Créer un compte
              </Link>
            </div>
          )}
          <MobileMenu navItems={navItems} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </header>
  );
}
