import Link from 'next/link';
import { ArrowRight, Compass, FileText, Sparkles, MessageCircle, Shield, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanCard } from '@/components/pricing/plan-card';
import { ENERGY_PACKS } from '@/config/energy';

const modules = [
  {
    title: 'Aube — Diagnostic carrière',
    description: 'Croisez Big Five, RIASEC et préférences pour révéler des trajectoires sur mesure.',
    href: '/aube',
    includedIn: 'Découverte (1 essai) + Essentiel & Pro',
    effort: '≈ 12 min',
    outcome: 'Compatibilités carrières sur mesure',
    icon: Compass,
    accent: 'from-indigo-500/50 to-indigo-400/30',
  },
  {
    title: 'Créateur de CV',
    description: 'Générez un CV percutant et compatible ATS aligné sur votre rôle cible en quelques minutes.',
    href: '/cv-builder',
    includedIn: 'Découverte (1 essai) + Essentiel & Pro',
    effort: '≈ 15 min',
    outcome: 'CV enrichi + checklist ATS',
    icon: FileText,
    accent: 'from-purple-500/50 to-purple-400/30',
  },
  {
    title: 'Studio Lettres',
    description: 'Co-écrivez des lettres motivées ancrées dans vos preuves d’impact et le ton de l’entreprise.',
    href: '/letters',
    includedIn: 'Essentiel (5/mois) & Pro (illimité)',
    effort: '≈ 10 min',
    outcome: 'Lettre personnalisée + miroir émotionnel',
    icon: Sparkles,
    accent: 'from-emerald-500/40 to-emerald-400/20',
  },
  {
    title: 'Rise — Studio entretien',
    description: 'Préparez vos entretiens avec Luna, questions ciblées et feedback immédiat.',
    href: '/rise',
    includedIn: 'Découverte (3 échanges) + Essentiel & Pro',
    effort: '≈ 8 min',
    outcome: 'Script d’entretien + relances ciblées',
    icon: MessageCircle,
    accent: 'from-blue-500/40 to-blue-400/20',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              Phoenix × Luna · coach IA + parcours structurés
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
              <span className="text-base">🇫🇷</span>
              IA Française · Mistral AI
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Faites équipe avec Luna pour piloter votre transition professionnelle.
          </h1>
          <p className="max-w-xl text-lg text-white/70">
            Luna, propulsée par <strong className="text-white">Mistral AI</strong>, analyse vos diagnostics Aube, modélise vos trajectoires et vous accompagne sur chaque livrable (CV, lettres, préparation d'entretien). Vos données restent en Europe.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/luna"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
            >
              Voir Luna en action
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              Parcourir les offres
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-2 text-xs text-white/60">
            <p>Accès Découverte offert : 1 analyse express, un CV d’essai et 3 échanges avec Luna.</p>
            <p className="text-white/50">Programme bêta : vos retours sont collectés en continu pour enrichir Luna (avis publics à venir).</p>
          </div>
          <dl className="grid gap-6 sm:grid-cols-3">
            {[
              { label: 'Compatibilité carrière', value: '3 recommandations en temps réel' },
              { label: 'Parcours IA', value: 'Modules Aube, CV, Letters inclus' },
              { label: 'Assistant Luna', value: 'Sessions contextualisées 24/7' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <dt className="text-xs uppercase text-white/60">{item.label}</dt>
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

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-8 md:grid-cols-3 md:px-8">
        {[
          {
            title: 'Analyse guidée',
            description: 'Luna exploite votre diagnostic Aube pour identifier immédiatement vos écarts de compétences et lancer la discussion.',
          },
          {
            title: 'Coaching continu',
            description: 'Posez vos questions, Luna reformule vos réussites, prépare vos réponses d’entretien et suit votre énergie.',
          },
          {
            title: 'Livrables assistés',
            description: 'CV, lettres, sessions Rise : chaque module propose des suggestions Luna adaptées au rôle que vous ciblez.',
          },
        ].map((item) => (
          <div key={item.title} className="flex h-full flex-col justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
            <div>
              <span className="text-xs uppercase tracking-wide text-emerald-200/80">Luna vous accompagne</span>
              <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-emerald-100/90">{item.description}</p>
            </div>
            <div className="mt-4 text-xs text-emerald-200/70">Toujours contextualisé : vos réponses Aube, vos choix CV, vos drafts Rise.</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">IA Souveraine & Données Protégées</h2>
          <p className="mt-2 text-sm text-white/60">
            Phoenix-Luna fait le choix de l'intelligence artificielle française et de l'hébergement européen
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-blue-300" />
              <h3 className="font-semibold text-white">Mistral AI</h3>
            </div>
            <p className="text-sm text-white/70">
              Nous utilisons <strong className="text-white">Mistral AI</strong>, champion français de l'IA générative.
              Pas de dépendance aux géants américains.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold text-white">Données en Europe</h3>
            </div>
            <p className="text-sm text-white/70">
              Vos données sont hébergées en <strong className="text-white">Union Européenne</strong> (Amsterdam).
              Conformité RGPD garantie.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Code className="h-5 w-5 text-purple-300" />
              <h3 className="font-semibold text-white">Transparent & Éthique</h3>
            </div>
            <p className="text-sm text-white/70">
              Nous documentons nos choix technologiques et respectons votre vie privée.
              Pas de revente de données, jamais.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/50">
          <span>Technologie : Mistral AI</span>
          <span>•</span>
          <span>Hébergement : Railway EU (Amsterdam)</span>
          <span>•</span>
          <span>Développé dans le Var (83)</span>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-200">Packs énergie</p>
            <h2 className="text-3xl font-semibold text-white">Rechargez Luna quand vous en avez besoin</h2>
            <p className="text-sm text-white/60">
              Café, Petit-déj, Repas ou Buffet : choisissez la formule qui soutient votre cadence de préparation. Aucune reconduction automatique,
              sauf pour le buffet à volonté.
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {ENERGY_PACKS.map((pack) => (
            <PlanCard key={pack.id} pack={pack} />
          ))}
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
                <CardHeader className="relative space-y-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" /> Assisté par Luna
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                    <module.icon className="h-10 w-10 text-white/70" />
                  </div>
                </CardHeader>
                <CardContent className="relative flex flex-col gap-3 text-sm text-white/70">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-200">
                    <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2.5 py-1 uppercase tracking-wide">
                      {module.effort}
                    </span>
                    <span className="text-white/70">{module.outcome}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/60">
                    <span>Inclus : {module.includedIn}</span>
                    <span className="inline-flex items-center gap-2 text-emerald-200">
                      Explorer
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs uppercase tracking-wide text-emerald-200">Programme bêta</span>
            <h3 className="mt-2 text-lg font-semibold text-white">Vos retours guident Luna</h3>
            <p className="mt-2 max-w-2xl text-white/70">
              Les fonctionnalités Luna sont co-construites avec nos beta-testeurs. Partagez votre expérience pour influencer les prochaines itérations (rapports plus riches, assistance CV renforcée, coaching Rise ciblé).
            </p>
          </div>
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSdXQ2Myp_CKGQzGIa0l5vi2zTCmEeWrdvIjEugmm2n16OogsA/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/10 hover:text-emerald-50"
          >
            Contribuer au programme bêta
          </Link>
        </div>
      </section>
    </div>
  );
}
