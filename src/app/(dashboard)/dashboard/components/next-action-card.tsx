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
  subscriptionStatus: string;
  subscriptionPlan: string;
  latestMatchTitle: string | null;
  latestLetterTitle: string | null;
};

function createContext(snapshot: DashboardSnapshot): NextActionContext {
  const subscriptionStatus = snapshot.user?.subscriptionStatus ?? 'INACTIVE';
  const subscriptionPlan = snapshot.user?.subscriptionPlan ?? 'ESSENTIAL';
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
    subscriptionStatus,
    subscriptionPlan,
    latestMatchTitle,
    latestLetterTitle,
  };
}

const nextActionRules: Array<(context: NextActionContext) => NextActionConfig | null> = [
  (context) => {
    if (context.subscriptionStatus === 'PAST_DUE') {
      return {
        id: 'billing-update',
        badge: 'Compte',
        title: 'Mettre à jour votre accès',
        description: 'Votre abonnement est en attente de paiement. Actualisez votre moyen de paiement pour conserver les modules actifs.',
        cta: { label: 'Mettre à jour le paiement', href: '/account/billing' },
      };
    }
    if (context.subscriptionStatus === 'CANCELED') {
      return {
        id: 'plan-reactivation',
        badge: 'Compte',
        title: 'Réactiver votre abonnement',
        description: 'Réactivez Phoenix pour utiliser Aube, Letters et Rise sans interruption.',
        cta: { label: 'Voir les offres', href: '/pricing' },
      };
    }
    if (context.subscriptionStatus === 'INACTIVE') {
      return {
        id: 'plan-activation',
        badge: 'Compte',
        title: 'Activer l’accès complet',
        description: 'Choisissez un plan pour débloquer les analyses Aube et les générateurs IA.',
        cta: { label: 'Découvrir les plans', href: '/pricing' },
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
          <span className="text-xs uppercase tracking-wide text-white/40">
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
