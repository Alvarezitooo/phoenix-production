import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { DashboardSnapshot } from '@/lib/dashboard';

type NextActionCTA = {
  label: string;
  href: string;
};

type NextActionConfig = {
  id: string;
  title: string;
  description: string;
  cta: NextActionCTA;
  badge?: string;
};

type NextActionContext = {
  hasAssessments: boolean;
  hasMatches: boolean;
  hasResumeSummary: boolean;
  hasLetters: boolean;
  hasRiseSessions: boolean;
  hasConversations: boolean;
  hasErrors: boolean;
  energyBalance: number;
  latestMatchTitle: string | null;
  latestLetterTitle: string | null;
};

function createContext(snapshot: DashboardSnapshot): NextActionContext {
  const energyBalance = snapshot.user?.energyBalance ?? 0;
  const latestMatchTitle = snapshot.matches[0]?.title ?? null;
  const latestLetterTitle = snapshot.letters[0]?.title ?? null;

  return {
    hasAssessments: snapshot.assessments.length > 0,
    hasMatches: snapshot.matches.length > 0,
    hasResumeSummary: Boolean(snapshot.resumeSummary),
    hasLetters: snapshot.letters.length > 0,
    hasRiseSessions: snapshot.riseSessions.length > 0,
    hasConversations: snapshot.conversations.length > 0,
    hasErrors: snapshot.errors.length > 0,
    energyBalance,
    latestMatchTitle,
    latestLetterTitle,
  };
}

const nextActionRules: Array<(context: NextActionContext) => NextActionConfig | null> = [
  (context) => {
    if (context.energyBalance < 3) {
      return {
        id: 'energy-topup',
        badge: 'Énergie',
        title: 'Rechargez votre énergie Luna',
        description: 'Il vous reste peu de points. Rechargez pour continuer à générer CV, lettres et ateliers.',
        cta: { label: 'Voir les packs énergie', href: '/energy' },
      };
    }
    return null;
  },
  (context) => {
    if (!context.hasAssessments) {
      return {
        id: 'start-aube',
        badge: 'Étape 1',
        title: 'Lancer votre analyse Aube',
        description: 'Complétez l’évaluation pour révéler vos axes de progression et débloquer des recommandations ciblées.',
        cta: { label: 'Commencer Aube', href: '/aube' },
      };
    }
    return null;
  },
  (context) => {
    if (context.hasAssessments && !context.hasMatches) {
      return {
        id: 'explore-matches',
        badge: 'Étape 2',
        title: 'Générer vos recommandations personnalisées',
        description: 'Relancez Aube avec vos objectifs pour recevoir des opportunités alignées sur votre profil.',
        cta: { label: 'Explorer Aube', href: '/aube' },
      };
    }
    return null;
  },
  (context) => {
    if (context.hasMatches && !context.hasResumeSummary) {
      return {
        id: 'sync-resume',
        badge: 'Étape 3',
        title: 'Synchroniser votre CV Phoenix',
        description: 'Importez votre résumé pour préremplir lettres et ateliers avec vos expériences clés.',
        cta: { label: 'Ouvrir le CV Builder', href: '/cv-builder' },
      };
    }
    return null;
  },
  (context) => {
    if (context.hasResumeSummary && !context.hasLetters) {
      return {
        id: 'create-letter',
        badge: 'Étape 4',
        title: 'Rédiger votre lettre prioritaire',
        description: context.latestMatchTitle
          ? `Transformez « ${context.latestMatchTitle} » en une lettre percutante grâce aux recommandations Aube.`
          : 'Générez une lettre personnalisée à partir de vos recommandations et de votre résumé.',
        cta: { label: 'Préparer une lettre', href: '/letters' },
      };
    }
    return null;
  },
  (context) => {
    if (context.hasLetters && !context.hasRiseSessions) {
      return {
        id: 'launch-rise',
        badge: 'Étape 5',
        title: 'Préparer un atelier Rise',
        description: 'Simulez vos entretiens pour consolider vos messages clés et vos exemples d’impact.',
        cta: { label: 'Lancer Rise', href: '/rise' },
      };
    }
    return null;
  },
  (context) => {
    if (context.hasRiseSessions && !context.hasConversations) {
      return {
        id: 'open-luna',
        badge: 'Coaching',
        title: 'Débriefer avec Luna',
        description: 'Centralisez vos questions et synthétisez vos apprentissages en discutant avec Luna.',
        cta: { label: 'Parler à Luna', href: '/luna' },
      };
    }
    return null;
  },
];

function selectNextAction(snapshot: DashboardSnapshot): NextActionConfig {
  const context = createContext(snapshot);

  for (const rule of nextActionRules) {
    const action = rule(context);
    if (action) {
      return action;
    }
  }

  return {
    id: 'default-progress',
    badge: 'Progression',
    title: 'Continuer votre progression',
    description:
      context.latestLetterTitle
        ? `Reprenez vos préparations récentes, notamment « ${context.latestLetterTitle} ».`
        : 'Reprenez vos préparations en cours et consolidez vos prochaines étapes.',
    cta: { label: 'Ouvrir le dashboard', href: '/dashboard' },
  };
}

type NextActionCardProps = {
  snapshot: DashboardSnapshot;
};

export function NextActionCard({ snapshot }: NextActionCardProps) {
  const nextAction = selectNextAction(snapshot);

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="flex flex-col gap-4 p-5 text-white">
        <div>
          <span className="text-xs uppercase tracking-wide text-white/60">
            {nextAction.badge ?? 'Prochaine étape'}
          </span>
          <h2 className="mt-1 text-lg font-semibold">{nextAction.title}</h2>
          <p className="text-sm text-white/60">{nextAction.description}</p>
        </div>
        <div>
          <Link
            href={nextAction.cta.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
          >
            {nextAction.cta.label} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
