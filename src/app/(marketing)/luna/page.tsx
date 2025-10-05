import Link from 'next/link';
import { ArrowRight, Sparkles, Compass, MessageCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const pillars = [
  {
    title: 'Analyser',
    description:
      'Luna distille les résultats Aube (Big Five, RIASEC, préférences) et révèle instantanément vos leviers de mobilité.',
    detail: 'Synthèse personnalisée + pistes de trajectoires argumentées.',
    icon: Compass,
  },
  {
    title: 'Coacher',
    description:
      'Posez vos questions en continu : Luna reformule vos réussites, challenge vos ambitions et prépare vos réponses d’entretien.',
    detail: 'Prompts contextualisés, relances ciblées, suivi de votre énergie.',
    icon: MessageCircle,
  },
  {
    title: 'Produire',
    description:
      'Chaque livrable (CV, lettre, atelier Rise) s’appuie sur Luna pour booster alignement, ton et différenciation.',
    detail: 'Suggestions en temps réel + plans d’action pour les modules Phoenix.',
    icon: FileText,
  },
];

const journeys = [
  {
    label: '1. Diagnostic Aube',
    content:
      'Vos réponses alimentent un cerveau commun : traits psychométriques, expériences marquantes et ambitions. Luna s’en sert pour expliquer chaque trajectoire proposée.',
  },
  {
    label: '2. Coaching continu',
    content:
      'Depuis le dashboard, Luna suggère des questions adaptées à votre progression. Un clic suffit pour ouvrir le fil et poursuivre la conversation.',
  },
  {
    label: '3. Livrables assistés',
    content:
      'CV ciblé, lettre personnalisée, sessions Rise… chaque module offre des CTA “Demander à Luna” pour accélérer vos livrables ou les challenger.',
  },
];

const betaActions = [
  'Tester les popovers Luna dans Aube (reformulations, exemples).',
  'Débriefer votre trajectoire principale directement après l’analyse.',
  'Utiliser les suggestions Luna sur CV / Lettres / Rise pour accélérer vos livrables.',
  'Remonter vos besoins via le formulaire bêta pour prioriser les prochaines fonctionnalités.',
];

export default function LunaMarketingPage() {
  return (
    <div className="space-y-20">
      <section className="grid gap-12 lg:grid-cols-[1.3fr,1fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Luna · coach IA Phoenix
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Votre copilote pour clarifier, décider et exécuter vos prochaines étapes.
          </h1>
          <p className="max-w-2xl text-lg text-white/70">
            Luna consolide vos données Aube, vous challenge en temps réel et vous aide à produire des livrables différenciants. Une IA dédiée à l’évolution professionnelle, alignée sur vos contraintes et vos envies.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
            >
              Rejoindre le bêta Luna
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSdXQ2Myp_CKGQzGIa0l5vi2zTCmEeWrdvIjEugmm2n16OogsA/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/40 bg-white/5 px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 hover:text-emerald-50"
            >
              Partager son feedback
            </Link>
          </div>
          <p className="text-xs text-white/50">Programme bêta : collecte d’avis en cours – publication des témoignages dès réception.</p>
        </div>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Luna en action</CardTitle>
            <CardDescription>Exemple de dialogue lorsque vous finalisez une analyse Aube.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-white">Luna</p>
                <p>
                  Félicitations pour votre analyse complète ! Vous ciblez désormais <strong>Product Ops</strong> dans un environnement orienté impact. Je vois trois expériences clés que l’on peut mettre en avant. Souhaitez-vous que je vous aide à bâtir un pitch ou à préparer une question d’entretien ?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
                <span className="text-xs">Vous</span>
              </div>
              <div className="space-y-1">
                <p className="text-white">Vous</p>
                <p>
                  Aidons-nous à transformer la réalisation sur l’onboarding client en pitch pour mon entretien de jeudi.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-white">Luna</p>
                <p>
                  Parfait. Résumons en trois points : contexte, action, résultat. Tu as réduit le backlog de 40 % en 3 mois. Je te propose un pitch de 90 secondes et deux questions de relance pour garder la main pendant l’entretien.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="border-white/10 bg-white/5">
            <CardHeader>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">
                <pillar.icon className="h-4 w-4" />
                Pilotage Luna
              </span>
              <CardTitle>{pillar.title}</CardTitle>
              <CardDescription>{pillar.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-white/70">{pillar.detail}</CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70">
        <h2 className="text-2xl font-semibold text-white">Un fil conducteur unique</h2>
        <p className="mt-2 text-white/70">
          Luna est branchée sur toutes les étapes Phoenix. Vos données restent privées, votre expérience gagne en continuité.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {journeys.map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs uppercase tracking-wide text-emerald-200/80">{item.label}</span>
              <p className="mt-2 text-white/70">{item.content}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-sm text-emerald-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-emerald-200">Programme bêta</span>
            <h2 className="text-xl font-semibold text-white">Comment contribuer à l’évolution de Luna ?</h2>
            <p className="max-w-2xl">
              Nous priorisons les développements à partir de vos usages. Voici ce que nous observons chez les testeurs les plus actifs :
            </p>
            <ul className="grid gap-2 text-emerald-100/90 md:grid-cols-2">
              {betaActions.map((action) => (
                <li key={action} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSdXQ2Myp_CKGQzGIa0l5vi2zTCmEeWrdvIjEugmm2n16OogsA/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/50 bg-white/5 px-5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-white/10 hover:text-emerald-50"
          >
            Devenir testeur actif
          </Link>
        </div>
      </section>
    </div>
  );
}
