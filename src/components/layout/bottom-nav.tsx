'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Moon, PenSquare, Mountain, Sparkles } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/aube', label: 'Aube', icon: Moon },
  { href: '/letters', label: 'Letter', icon: PenSquare },
  { href: '/rise', label: 'Rise', icon: Mountain },
  { href: '/cv-builder', label: 'CV', icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-3xl border border-white/10 bg-slate-950/80 px-2 py-3 text-xs text-white/60 shadow-lg shadow-black/30 backdrop-blur md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition ${
              active ? 'text-white' : 'hover:text-white'
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? 'text-sky-300' : 'text-white/60'}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
