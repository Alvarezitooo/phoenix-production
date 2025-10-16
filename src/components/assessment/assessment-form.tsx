'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompatibilityBadge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AssessmentCompleteReport } from '@/components/assessment/assessment-complete-report';
import { LunaAssistHint } from '@/components/luna/luna-assist-hint';
import { ArrowRight, Lightbulb, ShieldCheck, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useSession } from 'next-auth/react';
import { ENERGY_COSTS } from '@/config/energy';

const ASSESSMENT_MODES = {
  QUICK: 'QUICK',
  COMPLETE: 'COMPLETE',
} as const;

type AssessmentMode = (typeof ASSESSMENT_MODES)[keyof typeof ASSESSMENT_MODES];

const EXPRESS_BASE_BIG_FIVE = {
  openness: 3,
  conscientiousness: 3,
  extraversion: 3,
  agreeableness: 3,
  neuroticism: 3,
} as const;

const EXPRESS_BASE_RIASEC = {
  realistic: 3,
  investigative: 3,
  artistic: 3,
  social: 3,
  enterprising: 3,
  conventional: 3,
} as const;

type BigFiveKey = keyof typeof EXPRESS_BASE_BIG_FIVE;
type RiasecKey = keyof typeof EXPRESS_BASE_RIASEC;

const BIG_FIVE_LABELS: Record<BigFiveKey, string> = {
  openness: 'Ouverture',
  conscientiousness: 'Rigueur',
  extraversion: 'Extraversion',
  agreeableness: 'Coopération',
  neuroticism: 'Stabilité émotionnelle',
};

const RIASEC_LABELS: Record<RiasecKey, string> = {
  realistic: 'Réaliste',
  investigative: 'Investigateur',
  artistic: 'Artistique',
  social: 'Social',
  enterprising: 'Entreprenant',
  conventional: 'Conventionnel',
};

const COMPLETE_STEP_DETAILS: Record<string, { title: string; description: string; bullets?: string[] }> = {
  'Profil Big Five': {
    title: 'Ajustez vos traits dominants',
    description: 'Positionnez chaque curseur selon la fréquence à laquelle vous adoptez ce comportement au travail.',
    bullets: ['1 = rarement · 5 = presque toujours', 'Appuyez-vous sur votre ressenti actuel, pas sur un idéal.'],
  },
  RIASEC: {
    title: 'Identifiez vos univers naturels',
    description: 'Chaque curseur exprime l’attirance pour un environnement. Cela permet de diversifier vos trajectoires.',
    bullets: [
      'Réaliste = terrain, concret',
      'Investigateur = analyse, recherche',
      'Artistique = création, expérience',
      'Social = accompagnement, pédagogie',
      'Entreprenant = pilotage, business',
      'Conventionnel = gestion, structure',
    ],
  },
  'Préférences': {
    title: 'Ancrez votre quotidien idéal',
    description: 'Sélectionnez les contextes qui vous donnent le plus d’énergie et les forces que vous mobilisez naturellement.',
  },
  'Expériences marquantes': {
    title: 'Mettez en avant vos preuves d’impact',
    description: 'Décrivez 2 à 3 situations où vous avez fait la différence. Mentionnez le contexte, votre rôle et le résultat.',
    bullets: ['Utilisez des verbes d’action + un résultat chiffré quand c’est possible', 'Une phrase par réalisation suffit'],
  },
  'Ambitions & contraintes': {
    title: 'Clarifiez votre cap professionnel',
    description: 'Expliquez l’évolution que vous visez et les conditions nécessaires pour qu’elle soit viable.',
    bullets: ['Quel rôle ou périmètre ciblez-vous ?', 'Y a-t-il des critères non négociables (salaire, rythme, localisation) ?'],
  },
  'Énergie professionnelle': {
    title: 'Cartographiez ce qui vous porte ou vous freine',
    description: 'Notez ce qui nourrit votre motivation au quotidien et ce qui la fatigue pour ajuster vos trajectoires.',
    bullets: ['Activités qui vous rechargent', 'Tâches ou environnements à doser'],
  },
  'Narratif professionnel': {
    title: 'Formulez votre ambition',
    description: 'Décrivez ce que vous souhaitez accomplir et dans quelles conditions vous voulez le réaliser.',
    bullets: [
      'Quel impact souhaitez-vous générer ?',
      'Dans quel type d’organisation évolueriez-vous idéalement ?',
      'Quel défi voulez-vous relever d’ici 12 mois ?',
    ],
  },
};

const expressOptions: Array<{
  id: string;
  tag: string;
  label: string;
  bigFive?: Partial<Record<BigFiveKey, number>>;
  riasec?: Partial<Record<RiasecKey, number>>;
}> = [
  {
    id: 'analyse-systemes',
    tag: 'Analyse & data',
    label: 'Je prends plaisir à investiguer des systèmes complexes et à faire parler les données.',
    bigFive: { openness: 1, conscientiousness: 1 },
    riasec: { investigative: 2, conventional: 1 },
  },
  {
    id: 'terrain-concret',
    tag: 'Terrain & opérations',
    label: 'Je veux voir un impact concret sur le terrain et coordonner des actions pragmatiques.',
    bigFive: { extraversion: 1 },
    riasec: { realistic: 2, enterprising: 1 },
  },
  {
    id: 'experience-humaine',
    tag: 'Accompagnement',
    label: 'Motiver, coacher et faire grandir les autres est ce qui me donne de l’énergie.',
    bigFive: { agreeableness: 1 },
    riasec: { social: 2, enterprising: 1 },
  },
  {
    id: 'vision-creativite',
    tag: 'Créativité',
    label: 'J’aime inventer de nouvelles expériences ou raconter des histoires qui embarquent.',
    bigFive: { openness: 2 },
    riasec: { artistic: 2 },
  },
  {
    id: 'strategie-business',
    tag: 'Stratégie',
    label: 'Piloter des projets ambitieux, fédérer des parties prenantes et chercher la performance me stimule.',
    bigFive: { conscientiousness: 1, extraversion: 1 },
    riasec: { enterprising: 2 },
  },
  {
    id: 'impact-societal',
    tag: 'Impact',
    label: 'Je veux contribuer à des transitions sociales ou écologiques visibles.',
    bigFive: { agreeableness: 1, openness: 1 },
    riasec: { social: 1, investigative: 1 },
  },
];

const formSchema = z.object({
  bigFive: z.object({
    openness: z.number().min(1).max(5),
    conscientiousness: z.number().min(1).max(5),
    extraversion: z.number().min(1).max(5),
    agreeableness: z.number().min(1).max(5),
    neuroticism: z.number().min(1).max(5),
  }),
  riasec: z.object({
    realistic: z.number().min(1).max(5),
    investigative: z.number().min(1).max(5),
    artistic: z.number().min(1).max(5),
    social: z.number().min(1).max(5),
    enterprising: z.number().min(1).max(5),
    conventional: z.number().min(1).max(5),
  }),
  workPreferences: z.array(z.string()).min(1, 'Sélectionnez au moins une préférence'),
  strengths: z.array(z.string()).min(1, 'Sélectionnez au moins une force'),
  growthAreas: z.array(z.string()),
  interests: z.array(z.string()),
  narrative: z.string().optional(),
  keyMoments: z.string().optional(),
  roleVision: z.string().optional(),
  nonNegotiables: z.string().optional(),
  energyBoosters: z.string().optional(),
  energyDrainers: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ReportContext = {
  workPreferences: string[];
  strengths: string[];
  growthAreas: string[];
  interests: string[];
  narrative?: string | null;
  keyMoments?: string;
  roleVision?: string;
  nonNegotiables?: string;
  energyBoosters?: string;
  energyDrainers?: string;
};

export type Recommendation = {
  id?: string;
  careerTitle: string;
  compatibilityScore: number;
  sector: string;
  description: string;
  requiredSkills: string[];
  salaryRange: string;
  quickWins?: string[];
  developmentFocus?: string[];
};

const preferenceOptions = ['Innovation', 'Impact social', 'Leadership', 'Analyse de données', 'Créativité', 'Relationnel client'];
const strengthsOptions = ['Vision stratégique', 'Résolution de problèmes', 'Gestion de projet', 'Communication', 'Coaching', 'Rigueur'];
const growthOptions = ['Prise de parole', 'Compétences techniques', 'Négociation', 'Gestion du stress', 'Networking'];
const interestOptions = ['Tech & Produit', 'Design', 'Marketing', 'People & Culture', 'Finance', 'Conseil'];

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function recomputeExpressScores(selected: string[]) {
  const nextBigFive: Record<BigFiveKey, number> = { ...EXPRESS_BASE_BIG_FIVE };
  const nextRiasec: Record<RiasecKey, number> = { ...EXPRESS_BASE_RIASEC };

  for (const id of selected) {
    const option = expressOptions.find((item) => item.id === id);
    if (!option) continue;
    if (option.bigFive) {
      for (const key of Object.keys(option.bigFive) as BigFiveKey[]) {
        nextBigFive[key] = clamp(nextBigFive[key] + (option.bigFive?.[key] ?? 0), 1, 5);
      }
    }
    if (option.riasec) {
      for (const key of Object.keys(option.riasec) as RiasecKey[]) {
        nextRiasec[key] = clamp(nextRiasec[key] + (option.riasec?.[key] ?? 0), 1, 5);
      }
    }
  }

  return { bigFive: nextBigFive, riasec: nextRiasec };
}

export function AssessmentForm() {
  const [mode, setMode] = useState<AssessmentMode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [expressSelections, setExpressSelections] = useState<string[]>([]);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [completedAssessmentId, setCompletedAssessmentId] = useState<string | null>(null);
  const { data: session } = useSession();
  const quickAssessmentCost = ENERGY_COSTS['assessment.quick'];
  const completeAssessmentCost = ENERGY_COSTS['assessment.complete'];
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(session?.user?.preferredCareerMatchId ?? null);
  const [selectingMatchId, setSelectingMatchId] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [reportContext, setReportContext] = useState<ReportContext | null>(null);
  const { showToast } = useToast();
  const {
    control,
    getValues,
    setValue,
    trigger,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bigFive: { ...EXPRESS_BASE_BIG_FIVE },
      riasec: { ...EXPRESS_BASE_RIASEC },
      workPreferences: [],
      strengths: [],
      growthAreas: [],
      interests: [],
      narrative: '',
      keyMoments: '',
      roleVision: '',
      nonNegotiables: '',
      energyBoosters: '',
      energyDrainers: '',
    },
    mode: 'onChange',
  });

  const steps = useMemo(() => {
    if (!mode) return [];
    if (mode === ASSESSMENT_MODES.QUICK) {
      return ['Profil express', 'Préférences clés', 'Vision rapide'];
    }
    return [
      'Profil Big Five',
      'RIASEC',
      'Préférences',
      'Expériences marquantes',
      'Ambitions & contraintes',
      'Énergie professionnelle',
      'Narratif professionnel',
    ];
  }, [mode]);

  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const watchedWorkPreferences = watch('workPreferences');
  const watchedStrengths = watch('strengths');
  const watchedGrowthAreas = watch('growthAreas');
  const watchedInterests = watch('interests');
  const watchedKeyMoments = watch('keyMoments') ?? '';
  const watchedRoleVision = watch('roleVision') ?? '';
  const watchedNonNegotiables = watch('nonNegotiables') ?? '';
  const watchedEnergyBoosters = watch('energyBoosters') ?? '';
  const watchedEnergyDrainers = watch('energyDrainers') ?? '';
  const watchedBigFive = watch('bigFive');
  const watchedRiasec = watch('riasec');
  const activeStep = mode ? steps[currentStep] : null;
  const stepDetail = mode === ASSESSMENT_MODES.COMPLETE && activeStep ? COMPLETE_STEP_DETAILS[activeStep] ?? null : null;

  useEffect(() => {
    setSelectedMatchId(session?.user?.preferredCareerMatchId ?? null);
  }, [session?.user?.preferredCareerMatchId]);

  async function handleNext() {
    if (!mode) return;
    let isValid = true;

    const currentKey = steps[currentStep];

    if (currentKey === 'Profil express') {
      if (expressSelections.length < 2) {
        setExpressError('Sélectionnez au moins deux éléments qui vous ressemblent.');
        isValid = false;
      } else {
        setExpressError(null);
      }
    }

    if (currentKey === 'Profil Big Five') {
      const valid = await trigger(['bigFive']);
      if (!valid) {
        isValid = false;
      }
    }

    if (currentKey === 'RIASEC') {
      const valid = await trigger(['riasec']);
      if (!valid) {
        isValid = false;
      }
    }

    if (currentKey.includes('Préférences')) {
      const valid = await trigger(['workPreferences', 'strengths']);
      if (!valid) {
        isValid = false;
      }

      if (mode === ASSESSMENT_MODES.COMPLETE) {
        const growthSelection = getValues('growthAreas') ?? [];
        const interestSelection = getValues('interests') ?? [];

        if (growthSelection.length === 0) {
          setError('growthAreas', { type: 'manual', message: 'Sélectionnez au moins une piste de progression' });
          isValid = false;
        } else {
          clearErrors('growthAreas');
        }

        if (interestSelection.length === 0) {
          setError('interests', { type: 'manual', message: "Sélectionnez au moins un centre d'intérêt" });
          isValid = false;
        } else {
          clearErrors('interests');
        }
      }
    }

    if (currentKey === 'Expériences marquantes') {
      const value = (getValues('keyMoments') ?? '').trim();
      if (mode === ASSESSMENT_MODES.COMPLETE && value.length < 80) {
        setError('keyMoments', {
          type: 'manual',
          message: 'Décrivez au moins une expérience significative (80 caractères minimum).',
        });
        isValid = false;
      } else {
        clearErrors('keyMoments');
      }
    }

    if (currentKey === 'Ambitions & contraintes') {
      const vision = (getValues('roleVision') ?? '').trim();
      if (mode === ASSESSMENT_MODES.COMPLETE && vision.length < 60) {
        setError('roleVision', {
          type: 'manual',
          message: 'Précisez la trajectoire envisagée (60 caractères minimum).',
        });
        isValid = false;
      } else {
        clearErrors('roleVision');
      }
    }

    if (currentKey === 'Vision rapide') {
      const vision = (getValues('roleVision') ?? '').trim();
      if (vision.length > 0 && vision.length < 30) {
        setError('roleVision', {
          type: 'manual',
          message: 'Ajoutez quelques détails supplémentaires pour clarifier votre vision.',
        });
        isValid = false;
      } else {
        clearErrors('roleVision');
      }
    }

    if (currentKey === 'Narratif professionnel') {
      const narrativeValue = (getValues('narrative') ?? '').trim();
      if (mode === ASSESSMENT_MODES.COMPLETE) {
        if (narrativeValue.length < 80) {
          setError('narrative', {
            type: 'manual',
            message: 'Ajoutez au moins 80 caractères pour contextualiser votre ambition.',
          });
          isValid = false;
        } else {
          clearErrors('narrative');
        }
      }
    }

    if (!isValid) return;

    if (currentStep < totalSteps - 1) {
      setCurrentStep((step) => step + 1);
    } else {
      await submitAssessment();
    }
  }

  async function submitAssessment() {
    if (!mode) return;
    setLoading(true);
    const values = getValues();
    setReportContext({
      workPreferences: values.workPreferences ?? [],
      strengths: values.strengths ?? [],
      growthAreas: values.growthAreas ?? [],
      interests: values.interests ?? [],
      narrative: values.narrative ?? '',
      keyMoments: values.keyMoments,
      roleVision: values.roleVision,
      nonNegotiables: values.nonNegotiables,
      energyBoosters: values.energyBoosters,
      energyDrainers: values.energyDrainers,
    });
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          responses: {
            bigFive: values.bigFive,
            riasec: values.riasec,
            workPreferences: values.workPreferences,
            strengths: values.strengths,
            growthAreas: mode === ASSESSMENT_MODES.COMPLETE ? values.growthAreas : undefined,
            interests: mode === ASSESSMENT_MODES.COMPLETE ? values.interests : undefined,
            narrative:
              mode === ASSESSMENT_MODES.COMPLETE ? (values.narrative ?? '').trim() : undefined,
            keyMoments: mode === ASSESSMENT_MODES.COMPLETE ? values.keyMoments?.trim() ?? '' : values.keyMoments?.trim() ?? undefined,
            roleVision: values.roleVision?.trim() ?? undefined,
            nonNegotiables: values.nonNegotiables?.trim() ?? undefined,
            energyBoosters: values.energyBoosters?.trim() ?? undefined,
            energyDrainers: values.energyDrainers?.trim() ?? undefined,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de compléter l\'analyse');
      }

      const data = (await response.json()) as {
        recommendations: Recommendation[];
        summary: string;
        assessmentId: string;
      };
      setResults(data.recommendations);
      setSummary(data.summary);
      setCompletedAssessmentId(data.assessmentId);
      showToast({
        title: mode === ASSESSMENT_MODES.COMPLETE ? 'Analyse complète finalisée' : 'Diagnostic express terminé',
        description: 'Luna peut vous aider à célébrer, clarifier et préparer la suite.',
        variant: 'success',
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  function resetFlow() {
    setMode(null);
    setCurrentStep(0);
    setResults(null);
    setSummary(null);
    setExpressSelections([]);
    setExpressError(null);
    setValue('bigFive', { ...EXPRESS_BASE_BIG_FIVE });
    setValue('riasec', { ...EXPRESS_BASE_RIASEC });
    setValue('workPreferences', []);
    setValue('strengths', []);
    setValue('growthAreas', []);
    setValue('interests', []);
    setValue('narrative', '');
    setValue('keyMoments', '');
    setValue('roleVision', '');
    setValue('nonNegotiables', '');
    setValue('energyBoosters', '');
    setValue('energyDrainers', '');
    setCompletedAssessmentId(null);
    setSelectionMessage(null);
    setSelectionError(null);
    setReportContext(null);
  }

  function startCompleteFlow() {
    setMode(ASSESSMENT_MODES.COMPLETE);
    setCurrentStep(0);
    setResults(null);
    setSummary(null);
    setExpressSelections([]);
    setExpressError(null);
    setValue('bigFive', { ...EXPRESS_BASE_BIG_FIVE });
    setValue('riasec', { ...EXPRESS_BASE_RIASEC });
    setValue('workPreferences', []);
    setValue('strengths', []);
    setValue('growthAreas', []);
    setValue('interests', []);
    setValue('narrative', '');
    setValue('keyMoments', '');
    setValue('roleVision', '');
    setValue('nonNegotiables', '');
    setValue('energyBoosters', '');
    setValue('energyDrainers', '');
    setCompletedAssessmentId(null);
    setSelectionMessage(null);
    setSelectionError(null);
    setReportContext(null);
  }

  function startExpressFlow() {
    setMode(ASSESSMENT_MODES.QUICK);
    setCurrentStep(0);
    setResults(null);
    setSummary(null);
    setExpressSelections([]);
    setExpressError(null);
    setValue('bigFive', { ...EXPRESS_BASE_BIG_FIVE });
    setValue('riasec', { ...EXPRESS_BASE_RIASEC });
    setValue('workPreferences', []);
    setValue('strengths', []);
    setValue('growthAreas', []);
    setValue('interests', []);
    setValue('narrative', '');
    setValue('keyMoments', '');
    setValue('roleVision', '');
    setValue('nonNegotiables', '');
    setValue('energyBoosters', '');
    setValue('energyDrainers', '');
    setCompletedAssessmentId(null);
    setSelectionMessage(null);
    setSelectionError(null);
    setReportContext(null);
  }

  function handleExpressToggle(id: string) {
    setExpressSelections((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      const { bigFive, riasec } = recomputeExpressScores(next);
      setValue('bigFive', bigFive, { shouldValidate: true });
      setValue('riasec', riasec, { shouldValidate: true });
      if (next.length >= 2) {
        setExpressError(null);
      }
      return next;
    });
  }

  async function handleSelectMatch(matchId: string) {
    if (!matchId) return;
    setSelectingMatchId(matchId);
    setSelectionMessage(null);
    setSelectionError(null);
    try {
      const response = await fetch('/api/career-matches/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.message ?? 'Impossible de définir cette trajectoire.';
        throw new Error(message);
      }
      setSelectedMatchId(matchId);
      setSelectionMessage('Trajectoire principale mise à jour.');
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : 'Erreur inattendue.');
    } finally {
      setSelectingMatchId(null);
    }
  }

  return (
    <div className="space-y-6">
      {!mode ? (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Choisissez votre trajectoire</CardTitle>
            <CardDescription>Deux parcours d&apos;analyse pour des recommandations personnalisées.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Analyse Express',
                subtitle: `Coût : ${quickAssessmentCost} point${quickAssessmentCost > 1 ? 's' : ''}`,
                description: 'Un diagnostic en moins de 3 minutes pour identifier vos pistes prioritaires.',
                onClick: startExpressFlow,
              },
              {
                title: 'Analyse Complète',
                subtitle: `Coût : ${completeAssessmentCost} point${completeAssessmentCost > 1 ? 's' : ''}`,
                description: 'Une exploration approfondie de vos traits, valeurs et ambitions avec rapport détaillé.',
                onClick: startCompleteFlow,
              },
            ].map((option) => (
              <button
                key={option.title}
                onClick={option.onClick}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-emerald-400/50 hover:bg-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{option.title}</h3>
                    <p className="text-sm text-emerald-200">{option.subtitle}</p>
                  </div>
                  <Zap className="h-6 w-6 text-emerald-300" />
                </div>
                <p className="mt-3 text-sm text-white/60">{option.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : results ? (
        mode === ASSESSMENT_MODES.QUICK ? (
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Diagnostic express Aube</CardTitle>
              <CardDescription>
                Votre piste prioritaire en un clin d’œil. Passez sur l’analyse complète pour explorer trois trajectoires et vos plans d’action détaillés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {summary && (
                <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 p-5 text-sm text-white/80">
                  {summary}
                </div>
              )}
              {results[0] && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{results[0].careerTitle}</h3>
                      <p className="text-sm text-white/60">{results[0].sector}</p>
                    </div>
                    <CompatibilityBadge value={Math.round(results[0].compatibilityScore)} />
                  </div>
                  <p className="mt-3 text-sm text-white/70">{results[0].description}</p>
                  {results[0].quickWins && results[0].quickWins.length > 0 && (
                    <div className="mt-4 space-y-2 text-xs text-white/60">
                      <span className="uppercase tracking-wide text-white/60">Actions rapides</span>
                      <ul className="space-y-1">
                        {results[0].quickWins.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {typeof results[0].id === 'string' && (
                    <div className="mt-4 flex items-center justify-end">
                      <Button
                        type="button"
                        variant={selectedMatchId === results[0].id ? 'secondary' : 'ghost'}
                        className="text-xs"
                        loading={selectingMatchId === results[0].id}
                        onClick={() => void handleSelectMatch(results[0].id as string)}
                      >
                        {selectedMatchId === results[0].id ? 'Trajectoire principale sélectionnée' : 'Définir comme trajectoire principale'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {(selectionMessage || selectionError) && (
                <div className="text-xs">
                  {selectionMessage && <p className="text-emerald-200">{selectionMessage}</p>}
                  {selectionError && <p className="text-rose-300">{selectionError}</p>}
                </div>
              )}
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-5 text-xs text-white/60">
                <p className="text-sm font-semibold text-white">Ce que débloque l&apos;analyse complète :</p>
                <ul className="mt-3 space-y-2">
                  <li>• Trois trajectoires détaillées avec écarts de compétences et salaire cible.</li>
                  <li>• Plans d&apos;upskilling personnalisés et intégration CV/Rise.</li>
                  <li>• Synthèse enrichie exploitant votre narratif professionnel.</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" onClick={resetFlow}>
                  Relancer une analyse
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={startCompleteFlow} variant="secondary" className="text-xs">
                    Explorer l&apos;analyse complète
                  </Button>
                  <Link
                    href="/energy"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
                  >
                    Recharger en énergie
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <AssessmentCompleteReport
              summary={summary}
              recommendations={results}
              assessmentId={completedAssessmentId}
              selectedMatchId={selectedMatchId}
              selectingMatchId={selectingMatchId}
              selectionMessage={selectionMessage}
              selectionError={selectionError}
              onSelectMatch={handleSelectMatch}
              context={reportContext}
            />
            <div className="flex items-center justify-end">
              <Button variant="ghost" onClick={resetFlow}>
                Relancer une analyse
              </Button>
            </div>
          </div>
        )
      ) : (
        <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Parcours {mode === ASSESSMENT_MODES.QUICK ? 'Analyse Express' : 'Analyse Complète'}</CardTitle>
                  <CardDescription>
                    {mode === ASSESSMENT_MODES.QUICK
                      ? '3 étapes ciblées pour obtenir un diagnostic instantané.'
                      : 'Complétez les étapes pour générer un rapport approfondi et actionnable.'}
                  </CardDescription>
                </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Vos réponses restent confidentielles
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Étape {currentStep + 1} sur {totalSteps}
              </p>
              <ProgressBar value={progress} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {stepDetail && (
              <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/30">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{stepDetail.title}</p>
                      <p className="text-white/80">{stepDetail.description}</p>
                    </div>
                    {stepDetail.bullets && (
                      <ul className="space-y-1 text-emerald-100/80">
                        {stepDetail.bullets.map((bullet) => (
                          <li key={bullet}>• {bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {steps[currentStep] === 'Profil express' && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Ce qui vous ressemble</h3>
                  <p className="mt-2 text-xs text-white/60">
                    Sélectionnez au moins deux affirmations. Vos réponses ajustent automatiquement votre profil personnalité + RIASEC.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {expressOptions.map((option) => {
                    const selected = expressSelections.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleExpressToggle(option.id)}
                        className={`flex h-full flex-col gap-2 rounded-3xl border px-4 py-4 text-left transition ${
                          selected
                            ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-emerald-300/40 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wide text-emerald-200">{option.tag}</span>
                        <span className="text-sm leading-relaxed">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {expressError && <p className="text-xs text-rose-300">{expressError}</p>}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="font-semibold text-white/80">Synthèse Big Five</p>
                      <ul className="mt-2 space-y-1">
                        {Object.entries(watchedBigFive ?? EXPRESS_BASE_BIG_FIVE).map(([key, value]) => (
                          <li key={key} className="flex items-center gap-2">
                            <span>{BIG_FIVE_LABELS[key as BigFiveKey]}</span>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/70">{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-white/80">Tendance RIASEC</p>
                      <ul className="mt-2 space-y-1">
                        {Object.entries(watchedRiasec ?? EXPRESS_BASE_RIASEC).map(([key, value]) => (
                          <li key={key} className="flex items-center gap-2">
                            <span>{RIASEC_LABELS[key as RiasecKey]}</span>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/70">{value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {steps[currentStep] === 'Profil Big Five' && (
              <div className="space-y-4">
                {Object.entries({
                  openness: 'Ouverture',
                  conscientiousness: 'Conscience professionnelle',
                  extraversion: 'Extraversion',
                  agreeableness: 'Agréabilité',
                  neuroticism: 'Stabilité émotionnelle',
                }).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <span>{label}</span>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">{getValues(`bigFive.${key as keyof FormValues['bigFive']}`)}</span>
                    </div>
                    <Controller
                      control={control}
                      name={`bigFive.${key as keyof FormValues['bigFive']}`}
                      render={({ field }) => (
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={field.value}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          className="w-full accent-emerald-400"
                        />
                      )}
                    />
                  </div>
                ))}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                  <p className="font-semibold text-white/80">Votre tendance actuelle</p>
                  <ul className="mt-2 grid gap-2 md:grid-cols-3">
                    {Object.entries(watchedBigFive ?? EXPRESS_BASE_BIG_FIVE).map(([key, value]) => (
                      <li key={key} className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2">
                        <span>{BIG_FIVE_LABELS[key as BigFiveKey]}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {steps[currentStep] === 'RIASEC' && (
              <div className="space-y-4">
                {Object.entries({
                  realistic: 'Réaliste',
                  investigative: 'Investigateur',
                  artistic: 'Artistique',
                  social: 'Social',
                  enterprising: 'Entreprenant',
                  conventional: 'Conventionnel',
                }).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <span>{label}</span>
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/50">{getValues(`riasec.${key as keyof FormValues['riasec']}`)}</span>
                    </div>
                    <Controller
                      control={control}
                      name={`riasec.${key as keyof FormValues['riasec']}`}
                      render={({ field }) => (
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={field.value}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          className="w-full accent-indigo-400"
                        />
                      )}
                    />
                  </div>
                ))}
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                  <p className="font-semibold text-white/80">Univers qui vous attirent</p>
                  <ul className="mt-2 grid gap-2 md:grid-cols-3">
                    {Object.entries(watchedRiasec ?? EXPRESS_BASE_RIASEC).map(([key, value]) => (
                      <li key={key} className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2">
                        <span>{RIASEC_LABELS[key as RiasecKey]}</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {steps[currentStep]?.includes('Préférences') && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Préférences de travail</h3>
                  <div className="flex flex-wrap gap-2">
                    {preferenceOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          const updated = toggleValue(watchedWorkPreferences ?? [], option);
                          setValue('workPreferences', updated, { shouldValidate: true });
                          if (updated.length > 0) {
                            clearErrors('workPreferences');
                          }
                        }}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          (watchedWorkPreferences ?? []).includes(option)
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.workPreferences && (
                    <p className="text-xs text-rose-300">{errors.workPreferences.message}</p>
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Forces principales</h3>
                  <div className="flex flex-wrap gap-2">
                    {strengthsOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          const updated = toggleValue(watchedStrengths ?? [], option);
                          setValue('strengths', updated, { shouldValidate: true });
                          if (updated.length > 0) {
                            clearErrors('strengths');
                          }
                        }}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          (watchedStrengths ?? []).includes(option)
                            ? 'bg-indigo-500/20 text-indigo-200'
                            : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.strengths && (
                    <p className="text-xs text-rose-300">{errors.strengths.message}</p>
                  )}
                </div>
                {mode === ASSESSMENT_MODES.COMPLETE && (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Axes de progression</h3>
                      <div className="flex flex-wrap gap-2">
                        {growthOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              const updated = toggleValue(watchedGrowthAreas ?? [], option);
                              setValue('growthAreas', updated, { shouldValidate: true });
                              if (updated.length > 0) {
                                clearErrors('growthAreas');
                              }
                            }}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                              (watchedGrowthAreas ?? []).includes(option)
                                ? 'bg-purple-500/20 text-purple-200'
                                : 'bg-white/5 text-white/60'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      {errors.growthAreas && (
                        <p className="text-xs text-rose-300">{errors.growthAreas.message}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Centres d&apos;intérêt</h3>
                      <div className="flex flex-wrap gap-2">
                        {interestOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              const updated = toggleValue(watchedInterests ?? [], option);
                              setValue('interests', updated, { shouldValidate: true });
                              if (updated.length > 0) {
                                clearErrors('interests');
                              }
                            }}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                              (watchedInterests ?? []).includes(option)
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'bg-white/5 text-white/60'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      {errors.interests && (
                        <p className="text-xs text-rose-300">{errors.interests.message}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {steps[currentStep] === 'Expériences marquantes' && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Vos réalisations pivots</h3>
                  <p className="mt-1 text-xs text-white/60">
                    Une ligne par expérience : contexte, rôle, action, résultat. Laissez-vous guider par les chiffres ou les retours clients si possible.
                  </p>
                </div>
                <LunaAssistHint
                  helper="Besoin d’idées ? Luna peut reformuler vos impacts ou suggérer des exemples."
                  getPrompt={() =>
                    `Tu es Luna, coach carrière. Aide à clarifier des expériences professionnelles pour un bilan Aube. Propose 2 à 3 reformulations concrètes ou axes à préciser (format puces). Texte actuel : ${
                      watchedKeyMoments.trim() || 'Pas encore de contenu, suggère des exemples adaptés à un parcours professionnel.'
                    }`
                  }
                  source="aube_experiences"
                />
                <Textarea
                  rows={6}
                  value={watchedKeyMoments}
                  onChange={(event) => setValue('keyMoments', event.target.value, { shouldValidate: false })}
                  placeholder="Exemple : Transformation de l’équipe support (12 pers.) — mise en place d’un centre d’aide + scripts IA — réduction de 40 % du backlog en 3 mois."
                />
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{watchedKeyMoments?.split('\n').filter(Boolean).length ?? 0} expérience(s)</span>
                  <span>{watchedKeyMoments?.length ?? 0}/600</span>
                </div>
                {errors.keyMoments && <p className="text-xs text-rose-300">{errors.keyMoments.message}</p>}
              </div>
            )}

            {steps[currentStep] === 'Ambitions & contraintes' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Cap souhaité</h3>
                  <LunaAssistHint
                    helper="Luna peut t’aider à formuler ton projet professionnel en une phrase claire."
                    getPrompt={() =>
                      `Tu es Luna, coach de carrière. Aide à formuler la trajectoire professionnelle visée : ${
                        watchedRoleVision.trim() || 'Aucune précision encore, propose 2 pistes de formulations selon un profil en transition.'
                      }.
                      Fournis 2 suggestions synthétiques (phrases courtes) et une question de clarification.`
                    }
                    source="aube_ambitions"
                  />
                  <Textarea
                    rows={4}
                    value={watchedRoleVision}
                    onChange={(event) => setValue('roleVision', event.target.value, { shouldValidate: false })}
                    placeholder="Exemple : Piloter une équipe produit data dans une scale-up impact, en lien direct avec CPO/CEO, pour relier stratégie business et analytics."
                  />
                  <div className="flex items-center justify-end text-xs text-white/50">
                    <span>{watchedRoleVision?.length ?? 0}/400</span>
                  </div>
                  {errors.roleVision && <p className="text-xs text-rose-300">{errors.roleVision.message}</p>}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Conditions à respecter (optionnel)</h3>
                  <LunaAssistHint
                    label="Lister avec Luna"
                    helper="Identifiez les contraintes indispensables (salaire, rythme, culture…)."
                    getPrompt={() =>
                      `Tu es Luna. L'utilisateur veut préciser ses contraintes professionnelles pour orienter ses trajectoires. Texte actuel : ${
                        watchedNonNegotiables.trim() || 'Pas encore d’éléments, propose une checklist concise de contraintes courantes.'
                      }.
                      Réponds par 3 suggestions de contraintes formulées en français.`
                    }
                    source="aube_contraintes"
                  />
                  <Textarea
                    rows={3}
                    value={watchedNonNegotiables}
                    onChange={(event) => setValue('nonNegotiables', event.target.value, { shouldValidate: false })}
                    placeholder="Salaire, rythme, localisation, modèle d’organisation, valeurs indispensables..."
                  />
                  <div className="flex items-center justify-end text-xs text-white/50">
                    <span>{watchedNonNegotiables?.length ?? 0}/300</span>
                  </div>
                </div>
              </div>
            )}

            {steps[currentStep] === 'Énergie professionnelle' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <LunaAssistHint
                    helper="Décrivez ce qui vous porte ou vous freine, Luna peut suggérer des pistes de régulation."
                    getPrompt={() =>
                      `Tu es Luna, coach énergie. L'utilisateur décrit ce qui lui donne ou retire de l'énergie au travail. Liste ce qu'il a noté comme boosters : ${
                        watchedEnergyBoosters.trim() || 'aucun booster mentionné'
                      }. Liste ce qu'il a noté comme freins : ${
                        watchedEnergyDrainers.trim() || 'aucun frein mentionné'
                      }. Propose 2 recommandations pour maximiser l'énergie et 2 idées pour limiter les freins (format puces).`
                    }
                    source="aube_energie"
                  />
                </div>
                <div className="space-y-2 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Ce qui vous dynamise</h3>
                  <Textarea
                    rows={4}
                    value={watchedEnergyBoosters}
                    onChange={(event) => setValue('energyBoosters', event.target.value, { shouldValidate: false })}
                    placeholder="Ex : Ateliers transverses, contact client direct, rythmes projets courts, pair design..."
                  />
                  <div className="flex items-center justify-end text-xs text-white/50">
                    <span>{watchedEnergyBoosters?.length ?? 0}/300</span>
                  </div>
                </div>
                <div className="space-y-2 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold text-white">Ce qui vous épuise</h3>
                  <Textarea
                    rows={4}
                    value={watchedEnergyDrainers}
                    onChange={(event) => setValue('energyDrainers', event.target.value, { shouldValidate: false })}
                    placeholder="Ex : Reporting micro-managé, décisions opaques, contexte hyper-politique, surcharge réunion..."
                  />
                  <div className="flex items-center justify-end text-xs text-white/50">
                    <span>{watchedEnergyDrainers?.length ?? 0}/300</span>
                  </div>
                </div>
              </div>
            )}

            {steps[currentStep] === 'Vision rapide' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Votre prochaine étape (optionnel)</h3>
                  <LunaAssistHint
                    helper="Luna peut t’aider à résumer en une phrase claire."
                    getPrompt={() =>
                      `Tu es Luna. Reformule la prochaine étape de carrière en une phrase inspirante et précise. Texte actuel : ${
                        watchedRoleVision.trim() || 'Rien pour le moment, propose deux pistes génériques mais crédibles.'
                      }. Réponds avec deux propositions.`
                    }
                    source="aube_vision_rapide"
                  />
                  <Textarea
                    rows={3}
                    value={watchedRoleVision}
                    onChange={(event) => setValue('roleVision', event.target.value, { shouldValidate: false })}
                    placeholder="Ex : Rejoindre une PME tech comme Product Ops pour structurer les rituels data/produit."
                  />
                  <div className="flex items-center justify-end text-xs text-white/50">
                    <span>{watchedRoleVision?.length ?? 0}/240</span>
                  </div>
                  {errors.roleVision && <p className="text-xs text-rose-300">{errors.roleVision.message}</p>}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-white/50">Points de vigilance (optionnel)</h4>
                  <Textarea
                    rows={3}
                    value={watchedNonNegotiables}
                    onChange={(event) => setValue('nonNegotiables', event.target.value, { shouldValidate: false })}
                    placeholder="Contraintes ou critères clés pour filtrer vos pistes."
                  />
                  <div className="flex items-center justify-end text-xs text-white/50">
                    <span>{watchedNonNegotiables?.length ?? 0}/240</span>
                  </div>
                </div>
              </div>
            )}

            {steps[currentStep] === 'Narratif professionnel' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Votre ambition</h3>
                <Textarea
                  rows={5}
                  placeholder="Décrivez l&apos;impact que vous souhaitez avoir, les contextes de travail idéaux et vos objectifs à 2 ans."
                  value={getValues('narrative')}
                  onChange={(event) => {
                    setValue('narrative', event.target.value, { shouldValidate: true });
                    if (errors.narrative) {
                      clearErrors('narrative');
                    }
                  }}
                />
                {errors.narrative && <p className="text-xs text-rose-300">{errors.narrative.message}</p>}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">
                {mode === ASSESSMENT_MODES.QUICK
                  ? `Coût : ${quickAssessmentCost} point${quickAssessmentCost > 1 ? 's' : ''} d’énergie`
                  : `Coût : ${completeAssessmentCost} point${completeAssessmentCost > 1 ? 's' : ''} d’énergie`}
              </div>
              <Button onClick={handleNext} loading={loading}>
                {currentStep === totalSteps - 1 ? 'Générer les résultats' : 'Étape suivante'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
