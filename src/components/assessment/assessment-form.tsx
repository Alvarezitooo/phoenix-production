'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompatibilityBadge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const ASSESSMENT_MODES = {
  QUICK: 'QUICK',
  COMPLETE: 'COMPLETE',
} as const;

type AssessmentMode = (typeof ASSESSMENT_MODES)[keyof typeof ASSESSMENT_MODES];

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
});

type FormValues = z.infer<typeof formSchema>;

type Recommendation = {
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

export function AssessmentForm() {
  const [mode, setMode] = useState<AssessmentMode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const router = useRouter();

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
      bigFive: {
        openness: 3,
        conscientiousness: 3,
        extraversion: 3,
        agreeableness: 3,
        neuroticism: 3,
      },
      riasec: {
        realistic: 3,
        investigative: 3,
        artistic: 3,
        social: 3,
        enterprising: 3,
        conventional: 3,
      },
      workPreferences: [],
      strengths: [],
      growthAreas: [],
      interests: [],
      narrative: '',
    },
    mode: 'onChange',
  });

  const steps = useMemo(() => {
    if (!mode) return [];
    if (mode === ASSESSMENT_MODES.QUICK) {
      return ['Profil Big Five', 'RIASEC', 'Préférences clés'];
    }
    return ['Profil Big Five', 'RIASEC', 'Préférences', 'Narratif professionnel'];
  }, [mode]);

  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const watchedWorkPreferences = watch('workPreferences');
  const watchedStrengths = watch('strengths');
  const watchedGrowthAreas = watch('growthAreas');
  const watchedInterests = watch('interests');

  async function handleNext() {
    if (!mode) return;
    let isValid = true;

    if (steps[currentStep]?.includes('Profil Big Five')) {
      const valid = await trigger(['bigFive']);
      if (!valid) {
        isValid = false;
      }
    }

    if (steps[currentStep]?.includes('RIASEC')) {
      const valid = await trigger(['riasec']);
      if (!valid) {
        isValid = false;
      }
    }

    if (steps[currentStep]?.includes('Préférences')) {
      const fieldsToValidate = mode === ASSESSMENT_MODES.QUICK ? ['workPreferences', 'strengths'] : ['workPreferences', 'strengths'];
      if (fieldsToValidate.length > 0) {
        const valid = await trigger(fieldsToValidate);
        if (!valid) {
          isValid = false;
        }
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

    if (steps[currentStep]?.includes('Narratif')) {
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
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de compléter l\'analyse');
      }

      const data = (await response.json()) as { recommendations: Recommendation[]; summary: string };
      setResults(data.recommendations);
      setSummary(data.summary);
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
  }

  function startCompleteFlow() {
    setMode(ASSESSMENT_MODES.COMPLETE);
    setCurrentStep(0);
    setResults(null);
    setSummary(null);
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
                title: 'Quick Analysis',
                subtitle: 'Inclus dans Essentiel',
                description: 'Un diagnostic express en 3 minutes pour révéler vos affinités métiers prioritaires.',
                mode: ASSESSMENT_MODES.QUICK,
              },
              {
                title: 'Complete Assessment',
                subtitle: 'Inclus dans Pro',
                description: 'Une exploration approfondie de vos traits, valeurs et ambitions avec un rapport complet.',
                mode: ASSESSMENT_MODES.COMPLETE,
              },
            ].map((option) => (
              <button
                key={option.title}
                onClick={() => setMode(option.mode)}
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
              <CardTitle>Diagnostic express Aube Quick</CardTitle>
              <CardDescription>
                Votre profil prioritaire en un clin d&apos;oeil. Passez sur l&apos;analyse complète pour explorer trois trajectoires et vos plans
                d&apos;action détaillés.
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
                      <span className="uppercase tracking-wide text-white/40">Actions rapides</span>
                      <ul className="space-y-1">
                        {results[0].quickWins.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                  <Link href="/pricing" className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400">
                    Passer au plan Pro
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Vos recommandations personnalisées</CardTitle>
              <CardDescription>
                Trois trajectoires prêtes à l&apos;emploi, vos chantiers d&apos;upskilling et les prochaines actions dans Phoenix.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {summary && (
                <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 p-5 text-sm text-white/80">
                  {summary}
                </div>
              )}
              {results.map((item) => (
                <div key={item.careerTitle} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.careerTitle}</h3>
                      <p className="text-sm text-white/60">{item.sector}</p>
                    </div>
                    <CompatibilityBadge value={Math.round(item.compatibilityScore)} />
                  </div>
                  <p className="mt-3 text-sm text-white/70">{item.description}</p>
                  {item.requiredSkills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
                      {item.requiredSkills.map((skill) => (
                        <span key={skill} className="rounded-full bg-white/10 px-3 py-1">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  {(item.developmentFocus?.length ?? 0) > 0 && (
                    <div className="mt-4 space-y-1 text-xs text-white/50">
                      <span className="uppercase tracking-wide text-white/40">Chantiers prioritaires</span>
                      <ul className="space-y-1">
                        {item.developmentFocus?.map((focus) => (
                          <li key={focus}>• {focus}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-2 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
                    <span>Rémunération indicative: {item.salaryRange}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => router.push('/cv-builder')}
                        type="button"
                      >
                        Préparer mon CV
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={() => router.push('/rise')}
                        type="button"
                      >
                        S&apos;entraîner avec Rise
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={resetFlow}>
                  Relancer une analyse
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parcours {mode === ASSESSMENT_MODES.QUICK ? 'Quick Analysis' : 'Complete Assessment'}</CardTitle>
                <CardDescription>
                  {mode === ASSESSMENT_MODES.QUICK ? '3 étapes rapides pour un diagnostic instantané.' : 'Complétez les étapes pour générer un rapport détaillé.'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Vos réponses restent confidentielles
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-white/40">
                Étape {currentStep + 1} sur {totalSteps}
              </p>
              <ProgressBar value={progress} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  ? 'Analyse Quick disponible avec le plan Essentiel.'
                  : 'Analyse Complete réservée au plan Pro.'}
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
