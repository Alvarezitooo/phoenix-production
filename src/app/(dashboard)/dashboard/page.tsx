import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Compass, FileText, MessageCircle, Sparkles, CheckCircle2, Circle, CalendarClock, Bot, ArrowUpRight } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { getDashboardSnapshot } from '@/lib/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { CompatibilityBadge } from '@/components/ui/badge';
import { NextActionCard } from './components/next-action-card';

const focusLabels: Record<string, string> = {
  behavioral: 'Comportemental',
  strategic: 'Stratégique',
  technical: 'Technique',
};

function formatFocus(focus: string): string {
  return focusLabels[focus] ?? focus;
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate));
}

const SUBSCRIPTION_PLAN_LABELS: Record<string, string> = {
  PRO: 'Pro',
  ESSENTIAL: 'Essentiel',
};

type SubscriptionDisplay = {
  planLabel: string;
  statusHeadline: string;
  helperText: string | null;
  badgeLabel: string;
  badgeClass: string;
  cta: {
    label: string;
    href: string;
  };
};

function computeSubscriptionDisplay(
  user:
    | {
        subscriptionPlan: string | null;
        subscriptionStatus: string | null;
        currentPeriodEnd: string | null;
      }
    | null,
): SubscriptionDisplay {
  const status = user?.subscriptionStatus ?? 'INACTIVE';
  const planKey = user?.subscriptionPlan ?? 'ESSENTIAL';
  const planLabel = SUBSCRIPTION_PLAN_LABELS[planKey] ?? planKey;
  const periodEnd = user?.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString('fr-FR') : null;

  switch (status) {
    case 'ACTIVE':
      return {
        planLabel,
        statusHeadline: 'Actif',
        helperText: periodEnd ? `Jusqu’au ${periodEnd}` : null,
        badgeLabel: 'À jour',
        badgeClass: 'border border-emerald-400/50 bg-emerald-500/10 text-emerald-200',
        cta: { label: 'Gérer mon plan', href: '/account/billing' },
      };
    case 'PAST_DUE':
      return {
        planLabel,
        statusHeadline: 'Paiement requis',
        helperText: 'Actualisez votre paiement pour conserver l’accès.',
        badgeLabel: 'À mettre à jour',
        badgeClass: 'border border-amber-400/50 bg-amber-500/10 text-amber-200',
        cta: { label: 'Mettre à jour le paiement', href: '/account/billing' },
      };
    case 'CANCELED':
      return {
        planLabel,
        statusHeadline: 'Résilié',
        helperText: periodEnd ? `Accès jusqu’au ${periodEnd}` : 'Réactivez votre abonnement pour reprendre votre progression.',
        badgeLabel: 'Résilié',
        badgeClass: 'border border-rose-400/50 bg-rose-500/10 text-rose-200',
        cta: { label: 'Réactiver mon plan', href: '/pricing' },
      };
    default:
      return {
        planLabel,
        statusHeadline: 'Inactif',
        helperText: 'Activez un plan pour débloquer les modules Phoenix.',
        badgeLabel: 'Inactif',
        badgeClass: 'border border-amber-400/50 bg-amber-500/10 text-amber-200',
        cta: { label: 'Découvrir les offres', href: '/pricing' },
      };
  }
}

type TimelineEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  icon: LucideIcon;
  typeLabel: string;
  cta?: {
    label: string;
    href: string;
  };
};

const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Terminé',
  IN_PROGRESS: 'En cours',
  DRAFT: 'Brouillon',
};

function formatAssessmentStatus(status: string): string {
  if (ASSESSMENT_STATUS_LABELS[status]) {
    return ASSESSMENT_STATUS_LABELS[status];
  }
  return status.replace(/_/g, ' ').toLowerCase();
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/auth/sign-in');
  }

  const snapshot = await getDashboardSnapshot(session.user.id);
  const { user, matches, resumeSummary, letterPreview, letters, riseSessions, assessments, conversations, errors } = snapshot;

  const subscriptionDisplay = computeSubscriptionDisplay(
    user
      ? {
          subscriptionPlan: user.subscriptionPlan,
          subscriptionStatus: user.subscriptionStatus,
          currentPeriodEnd: user.currentPeriodEnd,
        }
      : null,
  );

  const journeySteps = [
    {
      key: 'aube',
      label: 'Analyse Aube',
      description: assessments.length ? `${assessments.length} analysé${assessments.length > 1 ? 'es' : 'e'} complétée${assessments.length > 1 ? 's' : ''}` : "Lancez votre profil psychométrique",
      completed: assessments.length > 0,
      icon: Compass,
      href: '/aube',
    },
    {
      key: 'letters',
      label: 'Lettre motivée',
      description: letters.length ? 'Brouillon sauvegardé' : 'Préparez une lettre persuasive',
      completed: letters.length > 0,
      icon: FileText,
      href: letters.length ? `/letters?draftId=${letters[0].id}` : '/letters',
    },
    {
      key: 'rise',
      label: 'Rise coaching',
      description: riseSessions.length
        ? `Session ${formatFocus(riseSessions[0].focus)}`
        : 'Générez un atelier personnalisé',
      completed: riseSessions.length > 0,
      icon: MessageCircle,
      href: '/rise',
    },
  ];

  const completedSteps = journeySteps.filter((step) => step.completed).length;
  const progressValue = Math.round((completedSteps / journeySteps.length) * 100);

  const timelineEvents: TimelineEvent[] = [
    ...assessments.map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.mode === 'QUICK' ? 'Analyse Aube rapide' : 'Analyse Aube complète',
      description: `Statut : ${formatAssessmentStatus(assessment.status)}`,
      date: assessment.createdAt,
      icon: Compass,
      typeLabel: 'Aube',
      cta: { label: 'Voir Aube', href: '/aube' },
    })),
    ...letters.map((letter) => ({
      id: `letter-${letter.id}`,
      title: letter.title ?? 'Lettre sauvegardée',
      description: letter.alignScore !== null ? `Alignement ${Math.round(letter.alignScore)}%` : 'Brouillon mis à jour',
      date: letter.updatedAt,
      icon: FileText,
      typeLabel: 'Lettre',
      cta: { label: letter.alignScore !== null ? 'Ouvrir la lettre' : 'Ouvrir le brouillon', href: `/letters?draftId=${letter.id}` },
    })),
    ...riseSessions.map((session) => ({
      id: `rise-${session.id}`,
      title: `Session Rise – ${formatFocus(session.focus)}`,
      description: session.notesCount > 0 ? `${session.notesCount} note${session.notesCount > 1 ? 's' : ''} enregistrée${session.notesCount > 1 ? 's' : ''}` : 'Session créée',
      date: session.createdAt,
      icon: MessageCircle,
      typeLabel: 'Rise',
      cta: { label: 'Reprendre Rise', href: `/rise?s=${session.id}` },
    })),
    ...conversations.map((conversation) => ({
      id: `conversation-${conversation.id}`,
      title: conversation.title ?? 'Conversation Luna',
      description: conversation.messagesCount
        ? `${conversation.messagesCount} message${conversation.messagesCount > 1 ? 's' : ''}`
        : 'Session démarrée',
      date: conversation.updatedAt,
      icon: Bot,
      typeLabel: 'Luna',
      cta: conversation.id
        ? { label: 'Reprendre la discussion', href: `/luna?conversation=${conversation.id}` }
        : { label: 'Ouvrir Luna', href: '/luna' },
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const latestLetter = letters[0];
  const latestRise = riseSessions[0];

  const quickActions = [
    {
      title: assessments.length ? 'Revoir mes résultats Aube' : 'Lancer Aube',
      description: assessments.length
        ? 'Analyse terminée – explorez vos recommandations personnalisées.'
        : 'Débloquez vos recommandations de carrière en quelques minutes.',
      href: '/aube',
      icon: Compass,
      highlight: !assessments.length,
    },
    {
      title: latestLetter ? 'Finaliser ma lettre' : 'Préparer une lettre',
      description: latestLetter
        ? `Dernière mise à jour le ${formatDate(latestLetter.updatedAt)}`
        : 'Générez une lettre motivée adaptée à vos matches prioritaires.',
      href: latestLetter ? `/letters?draftId=${latestLetter.id}` : '/letters',
      icon: FileText,
      highlight: !latestLetter,
    },
    {
      title: latestRise ? 'Reprendre Rise' : 'Préparer un atelier Rise',
      description: latestRise
        ? `${formatFocus(latestRise.focus)} – ${formatDate(latestRise.createdAt)}`
        : 'Simulez des questions d’entretien ciblées et sauvegardez vos notes.',
      href: '/rise',
      icon: MessageCircle,
      highlight: !latestRise,
    },
    {
      title: 'Session Luna',
      description: 'Continuez la conversation avec Luna pour préparer vos prochaines étapes.',
      href: '/luna',
      icon: Sparkles,
      highlight: false,
    },
  ];

  return (
    <div className="space-y-8">
      {errors.length > 0 && (
        <div className="rounded-3xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm text-amber-100">
          Certaines données n’ont pas pu être chargées ({errors.join(', ')}). Tout le reste reste disponible.
        </div>
      )}

      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">
            Bonjour {user?.name ?? 'Phénix'} ! Prêt·e à faire décoller votre carrière ?
          </h1>
          <p className="text-sm text-white/60">
            Suivez votre progression, activez les modules IA et passez à l’action avec des recommandations personnalisées.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-sm text-white md:flex-row md:items-center">
          <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/10 px-6 py-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-white/50">Plan {subscriptionDisplay.planLabel}</span>
              <span className="text-lg font-semibold text-white">{subscriptionDisplay.statusHeadline}</span>
              {subscriptionDisplay.helperText && (
                <span className="text-xs text-white/50">{subscriptionDisplay.helperText}</span>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${subscriptionDisplay.badgeClass}`}
            >
              {subscriptionDisplay.badgeLabel}
            </span>
          </div>
          <Link
            href={subscriptionDisplay.cta.href}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
          >
            {subscriptionDisplay.cta.label}
          </Link>
        </div>
      </section>

      <section>
        <NextActionCard snapshot={snapshot} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recommandations prioritaires</CardTitle>
            <CardDescription>Basées sur vos analyses Aube</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/60">
                Complétez l’analyse Aube pour découvrir vos opportunités de carrière prioritaires.
                <div className="mt-4">
                  <Link
                    href="/aube"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
                  >
                    Lancer l’analyse <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-5 md:flex-row md:items-start md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{match.title}</h3>
                      <CompatibilityBadge value={Math.round(match.compatibilityScore)} />
                    </div>
                    {match.description && <p className="mt-2 text-sm text-white/60">{match.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
                      {match.requiredSkills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full bg-white/10 px-3 py-1">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/aube?select=${match.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-white/10"
                  >
                    Choisir
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progression personnalisée</CardTitle>
            <CardDescription>3 étapes pour capitaliser sur Phoenix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
                <span>Progression globale</span>
                <span>{progressValue}%</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={progressValue} />
              </div>
            </div>
            <div className="space-y-3">
              {journeySteps.map((step) => (
                <Link
                  key={step.key}
                  href={step.href}
                  className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/60 hover:bg-white/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        {step.label}
                        {step.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <Circle className="h-4 w-4 text-white/30" />
                        )}
                      </div>
                      <p className="text-xs text-white/60">{step.description}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-white/40 transition group-hover:text-emerald-200" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Préparations en cours</CardTitle>
            <CardDescription>Importez vos éléments clés pour la suite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs uppercase text-white/40">
                <span>Résumé CV Phoenix</span>
                <Link href="/cv-builder" className="inline-flex items-center gap-2 text-emerald-200 hover:text-emerald-100">
                  Ouvrir <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mt-2 text-sm text-white/70">
                {resumeSummary ? resumeSummary : 'Aucun résumé importé pour le moment. Synchronisez votre CV pour préremplir vos lettres et ateliers.'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs uppercase text-white/40">
                <span>Lettre motivée</span>
                <Link
                  href={latestLetter ? `/letters?draftId=${latestLetter.id}` : '/letters'}
                  className="inline-flex items-center gap-2 text-emerald-200 hover:text-emerald-100"
                >
                  {latestLetter ? 'Continuer' : 'Créer'} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mt-2 text-sm text-white/70">
                {letterPreview
                  ? `${letterPreview.slice(0, 220)}${letterPreview.length > 220 ? '…' : ''}`
                  : 'Générez une lettre personnalisée pour vos recommandations prioritaires.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Vos dernières actions sur Phoenix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {timelineEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/60">
                Aucune activité récente détectée. Activez un module pour démarrer votre progression.
              </div>
            ) : (
              timelineEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                    <event.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      {event.title}
                      {event.typeLabel && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                          {event.typeLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60">{event.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDate(event.date)}
                    </div>
                    {event.cta && (
                      <div className="mt-2">
                        <Link
                          href={event.cta.href}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 transition hover:text-emerald-100"
                        >
                          {event.cta.label} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Accès rapide aux modules</CardTitle>
            <CardDescription>Activez les fonctionnalités incluses dans votre abonnement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`group flex items-center justify-between rounded-3xl border border-white/5 bg-white/5 p-5 transition hover:border-emerald-400/60 hover:bg-white/10 ${
                    action.highlight ? 'ring-1 ring-emerald-400/40' : ''
                  }`}
                >
                  <div>
                    <h3 className="text-base font-semibold text-white">{action.title}</h3>
                    <p className="text-sm text-white/60">{action.description}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    <action.icon className="h-5 w-5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
