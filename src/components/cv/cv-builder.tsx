'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BadgeCheck, Download, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

type ContextResponse = {
  assessment: {
    summary?: string | null;
    strengths?: string[];
    workPreferences?: string[];
    growthAreas?: string[];
    interests?: string[];
    narrative?: string | null;
  } | null;
  careerMatches: Array<{
    id: string;
    title: string;
    compatibilityScore?: number;
    description?: string | null;
    requiredSkills: string[];
    salaryRange?: string | null;
  }>;
  resumeDrafts: Array<{
    id: string;
    title: string | null;
    template: string;
    tone: string | null;
    language: string | null;
    version: number;
    alignScore: number | null;
    updatedAt: string;
    feedback: Array<{ id: string; section: string; message: string; createdAt: string }>;
  }>;
};

type DraftDetails = {
  draft: {
    id: string;
    content: {
      resumeMarkdown?: string;
      atsChecklist?: string[];
      nextActions?: string[];
      input?: {
        targetRole?: string;
        template?: 'modern' | 'minimal' | 'executive';
        summary?: string;
        experiences?: Array<{ company: string; role: string; achievements: string[] }>;
        skills?: string[];
        tone?: 'impact' | 'leadership' | 'international' | 'default';
        language?: 'fr' | 'en';
      };
    } | null;
    alignScore: number | null;
    title: string | null;
    template: string;
    tone: string | null;
    language: string | null;
  };
};

const formSchema = z.object({
  targetRole: z.string().min(2),
  template: z.enum(['modern', 'minimal', 'executive']).default('modern'),
  summary: z.string().min(20),
  experiences: z
    .array(
      z.object({
        company: z.string().min(1),
        role: z.string().min(1),
        achievements: z.array(z.string().min(5)).min(1),
      }),
    )
    .min(1),
  skills: z.string().min(5),
  tone: z.enum(['impact', 'leadership', 'international', 'default']).default('impact'),
  language: z.enum(['fr', 'en']).default('fr'),
});

type FormValues = z.infer<typeof formSchema>;

type Insights = {
  atsChecklist: string[];
  nextActions: string[];
  alignScore: number | null;
};

const emptyExperience = { company: '', role: '', achievements: [''] };

const templates = [
  { key: 'modern', label: 'Moderne', description: 'Couleurs subtiles, mise en avant des résultats' },
  { key: 'minimal', label: 'Minimal', description: 'Structure épurée et sobre' },
  { key: 'executive', label: 'Executive', description: 'Approche stratégique et leadership' },
] as const;

const tones = [
  { key: 'impact', label: 'Impact', description: 'Bullet points dynamiques, ROI chiffré' },
  { key: 'leadership', label: 'Leadership', description: "Vision, pilotage d'équipe, influence" },
  { key: 'international', label: 'International', description: 'Positionnement global, anglais natif' },
  { key: 'default', label: 'Standard', description: 'Équilibré, corporate' },
] as const;

const languages = [
  { key: 'fr', label: 'FR', description: 'Adapté aux recrutements francophones' },
  { key: 'en', label: 'EN', description: 'Ciblage international / groupes US' },
] as const;

export function CvBuilder() {
  const router = useRouter();
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [resume, setResume] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [resumeDraft, setResumeDraft] = useState('');
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetRole: '',
      template: 'modern',
      summary: '',
      experiences: [emptyExperience],
      skills: '',
      tone: 'impact',
      language: 'fr',
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'experiences' });

  useEffect(() => {
    void refreshContext();
  }, []);

  async function refreshContext() {
    setContextLoading(true);
    setContextError(null);
    try {
      const response = await fetch('/api/cv/context');
      if (!response.ok) throw new Error('Impossible de récupérer le contexte Phoenix');
      const data = (await response.json()) as ContextResponse;
      setContext(data);
      if (data.careerMatches.length > 0) {
        setSelectedMatchId((current) => current ?? data.careerMatches[0].id);
      }
    } catch (error) {
      console.error('[CV_CONTEXT]', error);
      setContextError(error instanceof Error ? error.message : 'Erreur de chargement du contexte');
    } finally {
      setContextLoading(false);
    }
  }

  const careerMatches = useMemo(() => context?.careerMatches ?? [], [context?.careerMatches]);

  const selectedMatch = useMemo(() => {
    if (careerMatches.length === 0) return null;
    if (!selectedMatchId) return careerMatches[0];
    return careerMatches.find((match) => match.id === selectedMatchId) ?? careerMatches[0];
  }, [careerMatches, selectedMatchId]);

  function ensureExperienceCount() {
    if (fields.length === 0) {
      replace([emptyExperience]);
    }
  }

  function autofillFromContext() {
    if (!context) return;
    const match = selectedMatch;
    const assessment = context.assessment;

    if (match) {
      form.setValue('targetRole', match.title, { shouldValidate: true });
      if (match.requiredSkills.length > 0) {
        form.setValue('skills', match.requiredSkills.join(', '), { shouldValidate: true });
      }
    }

    if (assessment?.summary) {
      form.setValue('summary', assessment.summary, { shouldValidate: true });
    }

    if (assessment?.strengths?.length && (!match || match.requiredSkills.length === 0)) {
      form.setValue('skills', assessment.strengths.join(', '), { shouldValidate: true });
    }

    ensureExperienceCount();
    setStatusMessage('Champs pré-remplis avec vos données Phoenix. Ajustez avant de générer.');
  }

  async function generateResume(values: FormValues) {
    setLoading(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: values.targetRole,
          template: values.template,
          summary: values.summary,
          experiences: values.experiences.map((exp) => ({
            company: exp.company,
            role: exp.role,
            achievements: exp.achievements.filter(Boolean),
          })),
          skills: values.skills.split(',').map((item) => item.trim()).filter(Boolean),
          tone: values.tone,
          language: values.language,
          context: {
            strengths: context?.assessment?.strengths,
            workPreferences: context?.assessment?.workPreferences,
            growthAreas: context?.assessment?.growthAreas,
            interests: context?.assessment?.interests,
            narrative: context?.assessment?.narrative ?? undefined,
            quickWins: selectedMatch?.description ? [selectedMatch.description] : undefined,
            developmentFocus: context?.assessment?.growthAreas,
            selectedMatch: selectedMatch
              ? {
                  title: selectedMatch.title,
                  compatibilityScore: selectedMatch.compatibilityScore,
                  requiredSkills: selectedMatch.requiredSkills,
                  salaryRange: selectedMatch.salaryRange ?? undefined,
                }
              : undefined,
            modules: { cvBuilder: true, letters: true, rise: true },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer le CV');
      }

      const data = (await response.json()) as { resume: string; insights?: Insights; draftId?: string };
      setResume(data.resume);
      setResumeDraft(data.resume);
      setInsights(data.insights ?? null);
      if (data.draftId) setDraftId(data.draftId);
      setIsEditingResume(false);
      setStatusMessage('CV généré et sauvegardé. Vérifiez la checklist puis exportez.');
      await refreshContext();
    } catch (error) {
      console.error('[CV_GENERATE]', error);
      setStatusMessage(error instanceof Error ? error.message : 'Erreur interne');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = form.handleSubmit(generateResume);

  async function handleExport() {
    if (!resume) {
      setStatusMessage("Générez un CV avant de lancer un export PDF.");
      return;
    }
    setExportLoading(true);
    try {
      const response = await fetch('/api/cv/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer le PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `phoenix-cv-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage('Export PDF généré avec succès.');
    } catch (error) {
      console.error('[CV_EXPORT]', error);
      setStatusMessage(error instanceof Error ? error.message : "Une erreur est survenue lors de l'export.");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleLoadDraft(draftIdToLoad: string) {
    try {
      const response = await fetch(`/api/cv/drafts?draftId=${draftIdToLoad}`);
      if (!response.ok) throw new Error('Impossible de charger ce brouillon.');
      const data = (await response.json()) as DraftDetails;
      const details = data.draft;
      const content = (details.content ?? {}) as DraftDetails['draft']['content'];
      const input = content?.input ?? {};

      form.reset({
        targetRole: input.targetRole ?? details.title ?? '',
        template: (input.template as FormValues['template']) ?? 'modern',
        summary: input.summary ?? '',
        experiences: normalizeExperiences(input.experiences ?? []),
        skills: (input.skills ?? []).join(', '),
        tone: (input.tone as FormValues['tone']) ?? 'impact',
        language: (input.language as FormValues['language']) ?? 'fr',
      });
      ensureExperienceCount();

      const markdown = content?.resumeMarkdown ?? '';
      setResume(markdown);
      setResumeDraft(markdown);
      setIsEditingResume(false);
      setInsights({
        atsChecklist: content?.atsChecklist ?? [],
        nextActions: content?.nextActions ?? [],
        alignScore: details.alignScore,
      });
      setDraftId(details.id);
      setStatusMessage('Brouillon chargé. Ajustez puis sauvegardez ou exportez.');
    } catch (error) {
      console.error('[CV_DRAFT_LOAD]', error);
      setStatusMessage(error instanceof Error ? error.message : 'Impossible de charger ce brouillon.');
    }
  }

  async function handleSaveDraft() {
    if (!draftId) {
      setStatusMessage('Générez ou chargez un brouillon avant de sauvegarder.');
      return;
    }

    setSaveDraftLoading(true);
    try {
      const response = await fetch('/api/cv/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          content: resumeDraft.trim(),
          alignScore: insights?.alignScore ?? null,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de sauvegarder le brouillon');
      }
      setResume(resumeDraft);
      setIsEditingResume(false);
      await refreshContext();
      setStatusMessage('Brouillon mis à jour avec succès.');
    } catch (error) {
      console.error('[CV_DRAFT_SAVE]', error);
      setStatusMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde du brouillon.');
    } finally {
      setSaveDraftLoading(false);
    }
  }

  function handleReset() {
    form.reset();
    replace([emptyExperience]);
    setResume('');
    setResumeDraft('');
    setInsights(null);
    setDraftId(null);
    setIsEditingResume(false);
    setStatusMessage('Réinitialisé. Remplissez le formulaire pour générer un nouveau CV.');
  }

  function handleSendToLuna() {
    if (!draftId) {
      setStatusMessage("Générez et sauvegardez un CV pour l'envoyer à Luna.");
      return;
    }
    router.push(`/luna?resumeDraft=${draftId}`);
  }

  function handleLaunchRise() {
    const params = new URLSearchParams();
    if (selectedMatch?.title) params.set('focus', selectedMatch.title);
    if (draftId) params.set('resumeDraft', draftId);
    router.push(`/rise?${params.toString()}`);
  }

  const previewMarkdown = isEditingResume ? resumeDraft : resume;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Paramètres du CV</CardTitle>
              <p className="mt-1 text-xs text-white/50">Exploitez vos analyses Phoenix pour un CV cohérent et impactant.</p>
            </div>
            <Button type="button" variant="ghost" onClick={autofillFromContext} disabled={!context || contextLoading}>
              <Sparkles className="h-4 w-4" /> Pré-remplir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {contextLoading && (
            <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement du contexte Phoenix…
            </div>
          )}

          {contextError && (
            <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {contextError}
              <Button type="button" variant="ghost" className="ml-2 text-red-200" onClick={refreshContext}>
                Réessayer
              </Button>
            </div>
          )}

          {careerMatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
                <span>Trajectoires Aube compatibles</span>
                <span>Choisissez le focus</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {careerMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-left text-xs transition',
                      selectedMatchId === match.id
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/60',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{match.title}</span>
                      {selectedMatchId === match.id && <BadgeCheck className="h-4 w-4 text-emerald-300" />}
                    </div>
                    {typeof match.compatibilityScore === 'number' && (
                      <p className="mt-1 text-[11px] text-emerald-200">Compatibilité {Math.round(match.compatibilityScore)}%</p>
                    )}
                    {match.requiredSkills.length > 0 && (
                      <p className="mt-2 text-[11px] text-white/50">Skills clés : {match.requiredSkills.slice(0, 3).join(', ')}…</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 p-3 text-xs text-indigo-100">{statusMessage}</div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Intitulé visé</label>
              <Input placeholder="Ex: Product Manager Senior" {...form.register('targetRole')} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Résumé professionnel</label>
              <Textarea rows={4} placeholder="Synthétisez vos impacts, secteurs, résultats clés." {...form.register('summary')} />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Template</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {templates.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.key}
                    onClick={() => form.setValue('template', tpl.key)}
                    className={cn(
                      'rounded-2xl border px-3 py-4 text-left text-xs transition',
                      form.watch('template') === tpl.key
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/60',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{tpl.label}</span>
                      {form.watch('template') === tpl.key && <BadgeCheck className="h-4 w-4 text-emerald-300" />}
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Tone</label>
                <div className="grid gap-2">
                  {tones.map((tone) => (
                    <button
                      type="button"
                      key={tone.key}
                      onClick={() => form.setValue('tone', tone.key as FormValues['tone'])}
                      className={cn(
                        'rounded-2xl border px-3 py-3 text-left text-xs transition',
                        form.watch('tone') === tone.key
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60',
                      )}
                    >
                      <div className="font-semibold text-white">{tone.label}</div>
                      <p className="mt-1 text-[11px] text-white/50">{tone.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Langue</label>
                <div className="grid gap-2">
                  {languages.map((lang) => (
                    <button
                      type="button"
                      key={lang.key}
                      onClick={() => form.setValue('language', lang.key as FormValues['language'])}
                      className={cn(
                        'rounded-2xl border px-3 py-3 text-left text-xs transition',
                        form.watch('language') === lang.key
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/60',
                      )}
                    >
                      <div className="font-semibold text-white">{lang.label}</div>
                      <p className="mt-1 text-[11px] text-white/50">{lang.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Expériences</label>
                <Button type="button" variant="secondary" onClick={() => append({ company: '', role: '', achievements: [''] })}>
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase text-white/40">Expérience #{index + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-white/40 transition hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3">
                      <Input placeholder="Entreprise" {...form.register(`experiences.${index}.company` as const)} />
                      <Input placeholder="Rôle" {...form.register(`experiences.${index}.role` as const)} />
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-white/40">Réalisations</label>
                        {(form.watch(`experiences.${index}.achievements`) ?? []).map((_, achievementIndex) => (
                          <Input
                            key={achievementIndex}
                            placeholder="Résultat mesurable (ex: +30% NPS en 6 mois)"
                            {...form.register(`experiences.${index}.achievements.${achievementIndex}` as const)}
                          />
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => {
                            const achievements = form.getValues(`experiences.${index}.achievements` as const);
                            form.setValue(`experiences.${index}.achievements` as const, [...achievements, '']);
                          }}
                        >
                          <Plus className="h-4 w-4" /> Ajouter une réalisation
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Compétences (séparées par des virgules)</label>
              <Input placeholder="Produit, Analyse, Leadership, Scrum" {...form.register('skills')} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/50">
              <Button type="button" variant="ghost" onClick={handleReset}>
                Réinitialiser
              </Button>
              <Button type="submit" loading={loading}>
                Générer le CV
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-950/50">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Aperçu généré</CardTitle>
            {resume && (
              <div className="flex gap-2">
                <Button variant="secondary" type="button" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4" /> Réinitialiser
                </Button>
                <Button variant="ghost" type="button" onClick={handleExport} disabled={exportLoading}>
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="min-h-[400px] space-y-4 overflow-auto rounded-3xl bg-black/40 p-6 text-sm text-white/80">
          {resume ? (
            <>
              <article className="prose prose-invert max-w-none text-white/80" dangerouslySetInnerHTML={{ __html: markdownToHtml(previewMarkdown) }} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={isEditingResume ? 'secondary' : 'ghost'} onClick={() => setIsEditingResume((prev) => !prev)}>
                  {isEditingResume ? 'Aperçu' : 'Modifier le Markdown'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleSaveDraft} loading={saveDraftLoading}>
                  Sauvegarder le brouillon
                </Button>
                <Button type="button" variant="ghost" onClick={handleSendToLuna}>
                  Envoyer à Luna
                </Button>
                <Button type="button" variant="ghost" onClick={handleLaunchRise}>
                  Préparer sur Rise
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/letters?from=cv')}>
                  Générer ma lettre d&apos;intro
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-white/50">Complétez le formulaire pour générer un CV optimisé aligné sur vos trajectoires Aube.</p>
          )}

          {isEditingResume && (
            <Textarea value={resumeDraft} onChange={(event) => setResumeDraft(event.target.value)} rows={16} className="mt-4" />
          )}

          {insights && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Checklist ATS</span>
                  {typeof insights.alignScore === 'number' && <Badge className="border-emerald-400/60 text-emerald-200">Alignement {Math.round(insights.alignScore)}%</Badge>}
                </div>
                <ul className="mt-3 space-y-2 text-xs text-white/60">
                  {insights.atsChecklist.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-indigo-400/40 bg-indigo-500/10 p-4">
                <span className="text-sm font-semibold text-white">Prochaines actions</span>
                <ul className="mt-2 space-y-2 text-xs text-white/70">
                  {insights.nextActions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {context?.resumeDrafts?.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Brouillons récents</span>
                <Button type="button" variant="ghost" className="text-xs" onClick={refreshContext}>
                  Rafraîchir
                </Button>
              </div>
              <div className="space-y-2 text-xs text-white/60">
                {context.resumeDrafts.map((draft) => (
                  <div key={draft.id} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{draft.title ?? 'CV sans titre'}</span>
                        <Badge className="border-white/20 text-white/60">v{draft.version}</Badge>
                      </div>
                      <span className="text-[11px] text-white/40">{new Date(draft.updatedAt).toLocaleString()}</span>
                    </div>
                    {draft.alignScore !== null && <p className="mt-1 text-[11px] text-emerald-200">Alignement : {Math.round(draft.alignScore)}%</p>}
                    {draft.feedback.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[11px]">
                        {draft.feedback.map((feedback) => (
                          <li key={feedback.id}>• {feedback.section} : {feedback.message}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" className="text-xs" onClick={() => handleLoadDraft(draft.id)}>
                        Charger ce brouillon
                      </Button>
                      <Button type="button" variant="ghost" className="text-xs" onClick={() => router.push(`/luna?resumeDraft=${draft.id}`)}>
                        Envoyer à Luna
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function markdownToHtml(markdown: string) {
  const html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '<br />');

  if (html.includes('<li>')) {
    return html.replace(/(<li>.*?<\/li>)/gim, '<ul>$1</ul>');
  }

  return html;
}

function normalizeExperiences(experiences: Array<{ company: string; role: string; achievements: string[] }>) {
  if (!experiences.length) {
    return [emptyExperience];
  }
  return experiences.map((exp) => ({
    company: exp.company ?? '',
    role: exp.role ?? '',
    achievements: exp.achievements?.length ? exp.achievements : [''],
  }));
}
