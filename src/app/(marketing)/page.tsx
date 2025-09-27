import Link from 'next/link';
import { ArrowRight, Compass, FileText, Sparkles, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanCard } from '@/components/pricing/plan-card';

const modules = [
  {
    title: 'Aube — Career Discovery',
    description: 'Unveil the roles that match your personality, values, and strengths through psychometrics.',
    href: '/aube',
    includedIn: 'Essentiel & Pro',
    icon: Compass,
    accent: 'from-indigo-500/50 to-indigo-400/30',
  },
  {
    title: 'CV Builder',
    description: 'Generate elegant, ATS-ready resumes tailored to your target roles in minutes.',
    href: '/cv-builder',
    includedIn: 'Essentiel & Pro',
    icon: FileText,
    accent: 'from-purple-500/50 to-purple-400/30',
  },
  {
    title: 'Letters',
    description: 'Draft persuasive cover letters and motivational statements with AI co-pilot support.',
    href: '/letters',
    includedIn: 'Essentiel & Pro',
    icon: Sparkles,
    accent: 'from-emerald-500/40 to-emerald-400/20',
  },
  {
    title: 'Rise — Interview Studio',
    description: 'Train with Luna for behavioral and technical interviews using real-time feedback.',
    href: '/rise',
    includedIn: 'Pro (illimité)',
    icon: MessageCircle,
    accent: 'from-blue-500/40 to-blue-400/20',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Plateforme carrière augmentée
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Découvrez, construisez et déployez votre prochaine étape professionnelle avec Phoenix.
          </h1>
          <p className="max-w-xl text-lg text-white/70">
            Phoenix combine des évaluations psychométriques avancées, un moteur d&apos;IA contextuel et des plans d’abonnement transparents pour accompagner chaque talent du diagnostic à l&apos;entretien.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Voir les offres
            </Link>
          </div>
          <dl className="grid gap-6 sm:grid-cols-3">
            {[
              { label: 'Compatibilité carrière', value: '3 recommandations en temps réel' },
              { label: 'Parcours IA', value: 'Modules Aube, CV, Letters inclus' },
              { label: 'Assistant Luna', value: 'Sessions contextualisées 24/7' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <dt className="text-xs uppercase text-white/40">{item.label}</dt>
                <dd className="text-sm text-white/80">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-black/60 p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-sm text-white/60">
              <span>Module d&apos;introduction Aube</span>
              <span>Compatibilité instantanée</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase text-emerald-200">Profil</div>
                <div className="mt-2 text-lg font-semibold text-white">Explorer ↗</div>
                <p className="text-sm text-white/70">Vos scores Big Five et RIASEC s&apos;alignent avec des rôles en product management.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-indigo-200">Recommandation</div>
                    <div className="mt-1 text-lg font-semibold text-white">Lead Product Strategist</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">86% match</span>
                </div>
                <p className="mt-2 text-sm text-white/70">Alignement élevé avec vos préférences d&apos;innovation et d&apos;impact.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-4 text-sm text-white/80">
                « Luna tisse vos forces pour dessiner une trajectoire professionnelle cohérente et inspirante. »
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-200">Plans mensuels</p>
            <h2 className="text-3xl font-semibold text-white">Deux formules pour piloter votre carrière</h2>
            <p className="text-sm text-white/60">
              Sans crédits à recharger : choisissez un abonnement, profitez des modules, annulez à tout moment.
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard
            plan="ESSENTIAL"
            title="Essentiel"
            price="17,99 €/mois"
            description="Pour clarifier son prochain rôle et optimiser ses candidatures."
            perks={[
              'Aube Quick illimité',
              'CV Builder et Letters en accès complet',
              '10 sessions Rise & Luna par mois',
              'Exports clés (docx, Markdown)',
            ]}
          />
          <PlanCard
            plan="PRO"
            title="Pro"
            price="29,99 €/mois"
            description="Pour accélérer sa trajectoire et se préparer aux entretiens exigeants."
            perks={[
              'Aube Complete + Quick illimités',
              'Exports premium (PDF, Notion, ATS)',
              'Sessions Rise & Luna illimitées',
              'Support prioritaire et coaching guidé',
            ]}
            highlight
          />
        </div>
      </section>

      <section>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Modules Phoenix</h2>
            <p className="text-sm text-white/60">Chaque abonnement débloque un parcours carrière complet, du diagnostic à la préparation d’entretien.</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {modules.map((module) => (
            <Link key={module.title} href={module.href} className="group">
              <Card className="relative h-full overflow-hidden">
                <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${module.accent} blur-3xl transition group-hover:scale-110`} />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                    <module.icon className="h-10 w-10 text-white/70" />
                  </div>
                </CardHeader>
                <CardContent className="relative flex items-center justify-between text-sm text-white/60">
                  <span>Inclus : {module.includedIn}</span>
                  <span className="inline-flex items-center gap-2 text-emerald-200">
                    Explorer
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
