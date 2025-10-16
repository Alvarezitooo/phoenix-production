'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useToast } from '@/components/ui/toast';
import { LunaAssistHint } from '@/components/luna/luna-assist-hint';
import { logLunaInteraction } from '@/utils/luna-analytics';

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
    element?: string | null;
    theme?: string | null;
    isShared?: boolean;
    shareSlug?: string | null;
    feedback: Array<{ id: string; section: string; message: string; createdAt: string }>;
  }>;
  aubeProfile: {
    element?: string | null;
    forces?: string[];
    shadow?: string | null;
    clarityNote?: string | null;
  } | null;
  riseStats?: {
    questsCompleted: number;
    victoriesLogged: number;
  };
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
    element?: string | null;
    theme?: string | null;
    shareSlug?: string | null;
    isShared?: boolean;
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

type FormValues = z.input<typeof formSchema>;

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
  const { showToast } = useToast();
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [resume, setResume] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [resumeDraft, setResumeDraft] = useState('');
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [shareState, setShareState] = useState<{ isShared: boolean; shareUrl: string | null; shareSlug: string | null }>({
    isShared: false,
    shareUrl: null,
    shareSlug: null,
  });

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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 360);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!draftId || !context) {
      setShareState({ isShared: false, shareUrl: null, shareSlug: null });
      return;
    }
    const draft = context.resumeDrafts.find((item) => item.id === draftId);
    if (!draft) {
      setShareState({ isShared: false, shareUrl: null, shareSlug: null });
      return;
    }
    if (typeof window !== 'undefined' && draft.isShared && draft.shareSlug) {
      setShareState({
        isShared: true,
        shareSlug: draft.shareSlug,
        shareUrl: `${window.location.origin}/cv/share/${draft.shareSlug}`,
      });
    } else {
      setShareState({ isShared: false, shareUrl: null, shareSlug: draft.shareSlug ?? null });
    }
  }, [draftId, context, form]);

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
      if (typeof window !== 'undefined' && data.resumeDrafts.length > 0) {
        const latest = data.resumeDrafts[0];
        if (latest.isShared && latest.shareSlug) {
          setShareState({
            isShared: true,
            shareSlug: latest.shareSlug,
            shareUrl: `${window.location.origin}/cv/share/${latest.shareSlug}`,
          });
        }
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

  function prepareSummary(summary?: string | null) {
    if (!summary) return '';
    const sentences = summary
      .split(/\n+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join(' ')
      .split(/(?<=\.)\s+/)
      .filter(Boolean);
    const selected = sentences.slice(0, 3).join(' ');
    const trimmed = selected || summary.trim();
    return trimmed.length > 400 ? `${trimmed.slice(0, 397).trim()}…` : trimmed;
  }

  function buildSkills(
    match?: ContextResponse['careerMatches'][number] | null,
    assessment?: ContextResponse['assessment'] | null,
  ) {
    const lowerSeen = new Set<string>();
    const result: string[] = [];
    const pushSkill = (skill: string) => {
      const clean = skill.replace(/\s+/g, ' ').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (lowerSeen.has(key)) return;
      lowerSeen.add(key);
      result.push(clean);
    };

    match?.requiredSkills?.forEach(pushSkill);
    assessment?.strengths?.forEach(pushSkill);

    return result;
  }

  function autofillFromContext() {
    if (!context) return;
    const match = selectedMatch;
    const assessment = context.assessment;

    if (match) {
      form.setValue('targetRole', match.title, { shouldValidate: true });
    }

    const suggestedSkills = buildSkills(match, assessment);
    if (suggestedSkills.length > 0) {
      form.setValue('skills', suggestedSkills.slice(0, 12).join(', '), { shouldValidate: true });
    }

    const preparedSummary = prepareSummary(assessment?.summary);
    if (preparedSummary) {
      form.setValue('summary', preparedSummary, { shouldValidate: true });
    }

    ensureExperienceCount();
    showToast({
      title: 'Préremplissage effectué',
      description: 'Vos champs clés ont été remplis avec les données Phoenix. Ajustez avant génération.',
      variant: 'info',
      duration: 4500,
    });
  }

  const updateShare = useCallback(
    async (share: boolean) => {
      if (!draftId) {
        showToast({ title: 'Partage indisponible', description: 'Génère un CV et sauvegarde-le avant d’activer le partage.', variant: 'info' });
        return;
      }

      try {
        const response = await fetch(`/api/cv/drafts/${draftId}/share`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ share }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message ?? 'Impossible de mettre à jour le partage');
        }

        const data = await response.json();
        if (share) {
          const shareUrl = data.shareUrl ?? (typeof window !== 'undefined' && data.shareSlug ? `${window.location.origin}/cv/share/${data.shareSlug}` : null);
          setShareState({ isShared: true, shareUrl, shareSlug: data.shareSlug ?? null });
        } else {
          setShareState({ isShared: false, shareUrl: null, shareSlug: null });
        }
        await refreshContext();
      } catch (error) {
        console.error('[CV_SHARE]', error);
        showToast({
          title: 'Partage CV',
          description: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du partage.',
          variant: 'error',
        });
      }
    },
    [draftId, showToast, refreshContext],
  );

  const handleCopyShare = useCallback(() => {
    if (!shareState.shareUrl) return;
    if (typeof navigator === 'undefined') return;
    navigator.clipboard
      ?.writeText(shareState.shareUrl)
      .then(() => {
        showToast({ title: 'Lien copié', description: 'Le lien de ton CV est dans le presse-papier.', variant: 'success' });
      })
      .catch(() => {
        showToast({ title: 'Copie impossible', description: 'Copie le lien manuellement.', variant: 'error' });
      });
  }, [shareState.shareUrl, showToast]);

  async function generateResume(values: FormValues) {
    setLoading(true);
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
            element: context?.aubeProfile?.element,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer le CV');
      }

      const data = (await response.json()) as { resume: string; insights?: Insights; draftId?: string; theme?: string };
      setResume(data.resume);
      setResumeDraft(data.resume);
      setInsights(data.insights ?? null);
      if (data.draftId) setDraftId(data.draftId);
      setIsEditingResume(false);
      setShareState({ isShared: false, shareUrl: null, shareSlug: null });
      showToast({
        title: 'CV généré',
        description: 'Ouvrez Luna pour transformer ces éléments en pitch ou plan d’action.',
        variant: 'success',
      });
      await refreshContext();
    } catch (error) {
      console.error('[CV_GENERATE]', error);
      showToast({
        title: 'Erreur génération CV',
        description: error instanceof Error ? error.message : 'Erreur interne',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = form.handleSubmit(generateResume);

  async function handleExport() {
    if (!resume) {
      showToast({
        title: 'Export impossible',
        description: 'Générez un CV avant de lancer un export PDF.',
        variant: 'info',
      });
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
      showToast({
        title: 'Export PDF prêt',
        description: 'Luna peut t’aider à préparer la relecture ou ton pitch d’entretien.',
        variant: 'success',
      });
    } catch (error) {
      console.error('[CV_EXPORT]', error);
      showToast({
        title: 'Erreur export PDF',
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'export.",
        variant: 'error',
      });
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
      if (details.isShared && details.shareSlug && typeof window !== 'undefined') {
        setShareState({
          isShared: true,
          shareSlug: details.shareSlug,
          shareUrl: `${window.location.origin}/cv/share/${details.shareSlug}`,
        });
      } else {
        setShareState({ isShared: Boolean(details.isShared), shareSlug: details.shareSlug ?? null, shareUrl: null });
      }
      showToast({
        title: 'Brouillon chargé',
        description: 'Ajustez les éléments puis sauvegardez ou exportez votre CV.',
        variant: 'info',
      });
    } catch (error) {
      console.error('[CV_DRAFT_LOAD]', error);
      showToast({
        title: 'Erreur brouillon',
        description: error instanceof Error ? error.message : 'Impossible de charger ce brouillon.',
        variant: 'error',
      });
    }
  }

  async function handleSaveDraft() {
    if (!draftId) {
      showToast({
        title: 'Aucun brouillon actif',
        description: 'Générez ou chargez un brouillon avant de sauvegarder.',
        variant: 'info',
      });
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
      showToast({
        title: 'Brouillon mis à jour',
        description: 'Les dernières modifications ont été enregistrées.',
        variant: 'success',
      });
    } catch (error) {
      console.error('[CV_DRAFT_SAVE]', error);
      showToast({
        title: 'Erreur sauvegarde',
        description: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde du brouillon.',
        variant: 'error',
      });
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
    setShareState({ isShared: false, shareUrl: null, shareSlug: null });
    showToast({
      title: 'Formulaire réinitialisé',
      description: 'Complétez le formulaire pour générer un nouveau CV.',
      variant: 'info',
    });
  }

  const openLunaForCurrentCV = useCallback(() => {
    const values = form.getValues();
    const prompt = `Tu es Luna, coach carrière. Voici les éléments de mon CV en cours : rôle cible ${
      values.targetRole || 'non précisé'
    }, résumé : ${values.summary || 'à rédiger'}, compétences : ${values.skills || ''}. Suggère 3 axes pour renforcer l'impact du CV et une question pour préparer mon pitch.`;
    window.dispatchEvent(new CustomEvent('phoenix:luna-open', { detail: { prompt, source: 'cv_builder' } }));
    showToast({
      title: 'Ouverture de Luna',
      description: 'La conversation reprend avec votre contexte CV.',
      variant: 'info',
    });
    logLunaInteraction('cv_brief_luna', { hasResume: Boolean(values.summary.trim()), targetRole: values.targetRole });
  }, [form, showToast]);

  function handleLaunchRise() {
    const params = new URLSearchParams();
    if (selectedMatch?.title) params.set('focus', selectedMatch.title);
    if (draftId) params.set('resumeDraft', draftId);
    router.push(`/rise?${params.toString()}`);
  }

  const previewMarkdown = isEditingResume ? resumeDraft : resume;
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Paramètres du CV</CardTitle>
                <p className="mt-1 text-xs text-white/50">Exploitez vos analyses Phoenix pour un CV cohérent et impactant.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={openLunaForCurrentCV}>
                  <Sparkles className="h-4 w-4" /> Briefer Luna
                </Button>
                <Button type="button" variant="ghost" onClick={autofillFromContext} disabled={!context || contextLoading}>
                  Pré-remplir
                </Button>
              </div>
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

          {context?.aubeProfile && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-white/50">Profil Aube</span>
                <Badge className="border-white/15 text-white/70">Élément {context.aubeProfile.element ?? 'Air'}</Badge>
              </div>
              {context.aubeProfile.forces && context.aubeProfile.forces.length > 0 && (
                <p className="mt-2 text-xs text-white/60">Forces : {context.aubeProfile.forces.slice(0, 3).join(', ')}…</p>
              )}
              {context.aubeProfile.shadow && <p className="text-xs text-white/50">Zone d’attention : {context.aubeProfile.shadow}</p>}
              {context.aubeProfile.clarityNote && <p className="text-xs text-white/40">Clarté : {context.aubeProfile.clarityNote}</p>}
              {context.riseStats && (
                <p className="mt-2 text-[11px] text-white/50">
                  Rise : {context.riseStats.questsCompleted} quêtes réalisées • {context.riseStats.victoriesLogged} victoires consignées
                </p>
              )}
            </div>
          )}

          {careerMatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
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

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Intitulé visé</label>
              <Input placeholder="Ex: Product Manager Senior" {...form.register('targetRole')} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Résumé professionnel</label>
              <LunaAssistHint
                helper="Luna peut reformuler ton résumé en 2 variantes axées impact."
                getPrompt={() =>
                  `Tu es Luna. Réécris mon résumé professionnel pour un CV ciblé. Texte actuel : ${
                    form.getValues('summary').trim() || 'Pas encore de résumé, propose deux versions orientées impact et leadership.'
                  }`
                }
                source="cv_summary"
              />
              <Textarea rows={4} placeholder="Synthétisez vos impacts, secteurs, résultats clés." {...form.register('summary')} />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Template</label>
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
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Tone</label>
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
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Langue</label>
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
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Expériences</label>
                <Button type="button" variant="secondary" onClick={() => append({ company: '', role: '', achievements: [''] })}>
                  <Plus className="h-4 w-4" /> Ajouter
                </Button>
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase text-white/60">Expérience #{index + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-white/60 transition hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3">
                      <Input placeholder="Entreprise" {...form.register(`experiences.${index}.company` as const)} />
                      <Input placeholder="Rôle" {...form.register(`experiences.${index}.role` as const)} />
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-white/60">Réalisations</label>
                        <LunaAssistHint
                          helper="Demande à Luna de transformer une réalisation en résultat chiffré."
                          getPrompt={() =>
                            `Tu es Luna. Voici une réalisation professionnelle : ${
                              (form.getValues(`experiences.${index}.achievements` as const) ?? [])
                                .map((item) => item?.trim())
                                .filter(Boolean)
                                .join(' | ') ||
                              'Aucune réalisation saisie'
                            }. Transforme-la en impact mesurable et propose une reformulation concise.`
                          }
                          source="cv_experience"
                        />
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
              <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Compétences (séparées par des virgules)</label>
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
                    <Button type="button" variant="ghost" onClick={openLunaForCurrentCV}>
                      Débriefer avec Luna
                    </Button>
                <Button type="button" variant="ghost" onClick={handleLaunchRise}>
                  Préparer sur Rise
                </Button>
                <Button type="button" variant="ghost" onClick={() => router.push('/letters?from=cv')}>
                  Générer ma lettre d&apos;intro
                </Button>
                <Button
                  type="button"
                  variant={shareState.isShared ? 'secondary' : 'ghost'}
                  onClick={() => updateShare(!shareState.isShared)}
                  disabled={!draftId}
                >
                  {shareState.isShared ? 'Désactiver le profil public' : 'Activer le profil public'}
                </Button>
              </div>
              {shareState.isShared && shareState.shareUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/60 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                  <span className="truncate">{shareState.shareUrl}</span>
                  <Button type="button" variant="secondary" className="text-xs" onClick={handleCopyShare}>
                    Copier le lien
                  </Button>
                  <Button type="button" variant="ghost" className="text-xs" onClick={() => updateShare(false)}>
                    Arrêter le partage
                  </Button>
                </div>
              )}
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
                        {draft.isShared && draft.shareSlug && <Badge className="border-emerald-400/40 text-emerald-200">Public</Badge>}
                      </div>
                      <span className="text-[11px] text-white/60">{new Date(draft.updatedAt).toLocaleString()}</span>
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
      {showScrollTop && (
        <Button
          type="button"
          variant="secondary"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-4 z-[55] px-3 py-1.5 text-xs shadow-lg shadow-slate-950/20 md:hidden"
          onClick={scrollToTop}
          aria-label="Revenir en haut du formulaire"
        >
          Remonter
        </Button>
      )}
    </>
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
