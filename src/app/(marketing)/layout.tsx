import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { Shield } from 'lucide-react';
import type { ReactNode } from 'react';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_60%)]" />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 md:pt-16">{children}</main>
      <footer className="border-t border-white/10 bg-black/30 py-12 text-sm text-white/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 md:grid-cols-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Phoenix-Luna</h4>
            <p className="text-xs text-white/50">
              Accompagnement carrière propulsé par l'IA française
            </p>
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Phoenix · Tous droits réservés
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Ressources</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition">
                  Tarifs
                </Link>
              </li>
              <li>
                <a href="mailto:support@phoenix-career.fr" className="hover:text-white transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Légal</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li>
                <Link href="/mentions-legales" className="hover:text-white transition">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link href="/politique-confidentialite" className="hover:text-white transition">
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Engagement</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-center gap-2">
                <span className="text-base">🇫🇷</span>
                <span>IA Française (Mistral AI)</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Données UE · RGPD</span>
              </li>
              <li className="text-xs text-white/40">
                Développé dans le Var · Auto-entrepreneur
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
