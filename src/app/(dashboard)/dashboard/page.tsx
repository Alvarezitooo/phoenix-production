import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Compass, FileText, MessageCircle, Sparkles, CheckCircle2, Circle, CalendarClock, Bot, ArrowUpRight, Zap, Sunrise } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { getDashboardSnapshot } from '@/lib/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { CompatibilityBadge } from '@/components/ui/badge';
import { NextActionCard } from './components/next-action-card';
import { LunaSuggestionsCard, type LunaSuggestion } from './components/luna-suggestions-card';
import { DailyRituals } from './components/daily-rituals';
import { DashboardEnergy } from './components/dashboard-energy';
import { STREAK_BONUS_AMOUNT, STREAK_LENGTH_FOR_BONUS } from '@/lib/energy';

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
  const { user, matches, resumeSummary, letterPreview, letters, riseSessions, assessments, conversations, auroraCompleted, errors } = snapshot;

  const energyBalance = user?.energyBalance ?? 0;
  const streakDays = user?.streakDays ?? 0;
  const streakProgressRemainder = streakDays % STREAK_LENGTH_FOR_BONUS;
  const streakProgressDays = streakDays === 0 ? 0 : streakProgressRemainder === 0 ? STREAK_LENGTH_FOR_BONUS : streakProgressRemainder;
  const daysUntilBonus = streakProgressDays === STREAK_LENGTH_FOR_BONUS ? 0 : STREAK_LENGTH_FOR_BONUS - streakProgressDays;

  const lastActionLabel = user?.lastEnergyActionAt ? formatDate(user.lastEnergyActionAt) : null;

  const journeySteps = [
    {
      key: 'aube',
      label: 'Analyse Aube',
      description: assessments.length ? `${assessments.length} analysé${assessments.length > 1 ? 'es' : 'e'} complétée${assessments.length > 1 ? 's' : ''}` : "Lancez votre profil psychométrique",
      completed: assessments.length > 0,
      icon: Compass,
      href: '/aube',
      meta: '≈ 12 min',
    },
    {
      key: 'aurora',
      label: 'Aurora',
      description: auroraCompleted ? 'Parcours terminé' : 'Apprivoise l\'IA en 20 min',
      completed: auroraCompleted,
      icon: Sunrise,
      href: '/aurora',
      meta: '≈ 20 min',
    },
    {
      key: 'letters',
      label: 'Lettre motivée',
      description: letters.length ? 'Brouillon sauvegardé' : 'Préparez une lettre persuasive',
      completed: letters.length > 0,
      icon: FileText,
      href: letters.length ? `/letters?draftId=${letters[0].id}` : '/letters',
      meta: '≈ 10 min',
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
      meta: '≈ 8 min',
    },
  ];

  const completedSteps = journeySteps.filter((step) => step.completed).length;
  const progressValue = Math.round((completedSteps / journeySteps.length) * 100);
  const showOnboardingChecklist = completedSteps === 0;

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

  const lunaSuggestions: LunaSuggestion[] = [];
  const topMatch = matches[0];
  if (topMatch) {
    lunaSuggestions.push({
      id: `match-${topMatch.id}`,
      title: `Débriefer ${topMatch.title} avec Luna`,
      description: 'Identifiez trois premières actions pour tester cette trajectoire.',
      prompt: `Je viens de terminer une analyse Aube et je souhaite approfondir la trajectoire ${topMatch.title}. Donne-moi trois actions concrètes pour avancer cette semaine, en tenant compte de mes forces et contraintes.`,
    });
  }

  if (resumeSummary) {
    lunaSuggestions.push({
      id: 'resume-insights',
      title: 'Transformer votre résumé en pitch',
      description: 'Luna peut extraire trois points clés pour vos prochains entretiens.',
      prompt: `Voici le résumé de mon CV : ${resumeSummary}. Aide-moi à construire un pitch de 90 secondes et une question de relance.`,
    });
  } else if (latestLetter && lunaSuggestions.length < 2) {
    lunaSuggestions.push({
      id: `letter-${latestLetter.id}`,
      title: 'Relire ma lettre avec Luna',
      description: 'Obtenez des idées pour renforcer l’alignement culture/impact.',
      prompt: `J'ai une lettre de motivation en cours. Peux-tu me suggérer deux angles pour renforcer l'alignement culturel avant envoi ?`,
    });
  } else if (latestRise && lunaSuggestions.length < 2) {
    lunaSuggestions.push({
      id: `rise-${latestRise.id}`,
      title: 'Préparer une question Rise',
      description: 'Demandez à Luna une simulation d’entretien ciblée.',
      prompt: `Prépare une question d'entretien difficile à propos du rôle ${latestRise.role} (focus ${latestRise.focus}) et donne-moi une structure de réponse.`,
    });
  }

  if (lunaSuggestions.length === 0) {
    lunaSuggestions.push({
      id: 'kickoff',
      title: 'Par quoi commencer avec Luna ?',
      description: 'Recevez un plan en trois étapes pour activer Phoenix.',
      prompt: 'Je découvre Phoenix et je veux savoir comment Luna peut m’aider pas à pas. Propose trois étapes concrètes pour démarrer.',
    });
  }

  const limitedSuggestions = lunaSuggestions.slice(0, 2);

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
      <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-emerald-200/80">Programme bêta</span>
            <p className="mt-1 text-sm text-emerald-100">
              Partagez votre expérience pour nous aider à peaufiner Phoenix avant la version publique.
            </p>
          </div>
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSdXQ2Myp_CKGQzGIa0l5vi2zTCmEeWrdvIjEugmm2n16OogsA/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02] hover:shadow-xl"
          >
            Ouvrir le questionnaire
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-3xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm text-amber-100">
          Certaines données n’ont pas pu être chargées ({errors.join(', ')}). Tout le reste reste disponible.
        </div>
      )}

      {limitedSuggestions.length > 0 && <LunaSuggestionsCard suggestions={limitedSuggestions} />}

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
              <span className="text-xs uppercase text-white/50">Énergie disponible</span>
              <span className="text-lg font-semibold text-white">{energyBalance} pts</span>
              <span className="text-xs text-white/50">
                {daysUntilBonus === STREAK_LENGTH_FOR_BONUS
                  ? `Bonus +${STREAK_BONUS_AMOUNT} après ${STREAK_LENGTH_FOR_BONUS} jours consécutifs`
                  : `Encore ${daysUntilBonus} jour${daysUntilBonus > 1 ? 's' : ''} pour +${STREAK_BONUS_AMOUNT} énergie`}
              </span>
              {lastActionLabel && (
                <span className="text-[11px] text-white/40">Dernière action : {lastActionLabel}</span>
              )}
            </div>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              Bonus streak
            </span>
          </div>
          <Link
            href="/energy"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
          >
            <Zap className="h-4 w-4" /> Recharger en énergie
          </Link>
        </div>
      </section>

      {showOnboardingChecklist && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Checklist de démarrage</CardTitle>
            <CardDescription>Trois étapes pour activer Phoenix en moins de 15 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            <div className="flex flex-col gap-3">
              <Link
                href="/aube"
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/50 hover:bg-white/10"
              >
                <div>
                  <p className="text-white">1. Lancer Aube express</p>
                  <span className="text-xs text-white/60">Obtenez vos premières recommandations de trajectoires.</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/50" />
              </Link>
              <Link
                href="/cv-builder"
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/50 hover:bg-white/10"
              >
                <div>
                  <p className="text-white">2. Générer votre CV ciblé</p>
                  <span className="text-xs text-white/60">Activez le créateur de CV et importez vos expériences clés.</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/50" />
              </Link>
              <Link
                href="/rise"
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-emerald-400/50 hover:bg-white/10"
              >
                <div>
                  <p className="text-white">3. Ouvrir Rise & Luna</p>
                  <span className="text-xs text-white/60">Préparez une session d’entretien et discutez avec Luna.</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/50" />
              </Link>
            </div>
            <p className="text-xs text-white/50">
              Une fois ces étapes réalisées, vos prochains objectifs apparaîtront automatiquement dans le tableau de bord.
            </p>
          </CardContent>
        </Card>
      )}

      <section>
        <NextActionCard snapshot={snapshot} />
      </section>

      <DashboardEnergy
        balance={energyBalance}
        element={null}
        streakDays={streakDays}
        bonusAmount={STREAK_BONUS_AMOUNT}
        bonusThreshold={STREAK_LENGTH_FOR_BONUS}
        bonusProgressDays={streakProgressDays}
        daysUntilBonus={daysUntilBonus}
      />

      <DailyRituals />

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
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
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
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                          {step.meta}
                        </span>
                        <span>{step.description}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-white/60 transition group-hover:text-emerald-200" />
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
              <div className="flex items-center justify-between text-xs uppercase text-white/60">
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
              <div className="flex items-center justify-between text-xs uppercase text-white/60">
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
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
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
