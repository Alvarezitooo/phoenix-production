'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/toast';

const contextSchema = z.object({
  resume: z
    .object({
      summary: z.string().nullable(),
      skills: z.array(z.string()).optional(),
    })
    .nullable(),
  matches: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        compatibilityScore: z.number(),
        requiredSkills: z.array(z.string()),
      }),
    )
    .optional(),
  letterDrafts: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().nullable(),
        alignScore: z.number().nullable(),
        updatedAt: z.string(),
      }),
    )
    .optional(),
});

type LettersContext = z.infer<typeof contextSchema>;

type GenerationResponse = {
  content: string;
  draftId?: string;
};

const formSchema = z.object({
  jobTitle: z.string().min(2),
  company: z.string().min(2),
  hiringManager: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'impactful', 'storytelling', 'executive']).default('professional'),
  language: z.enum(['fr', 'en']).default('fr'),
  highlights: z.array(z.string().min(3)).min(2),
  alignmentHooks: z.array(z.string().min(3)).optional(),
  resumeSummary: z.string().min(20),
});

type FormValues = z.infer<typeof formSchema>;

type NotesPayload = {
  draftId: string;
  content: string;
};

type StepId = 'brief' | 'positioning' | 'arguments' | 'synthesis';

type StepDefinition = {
  id: StepId;
  title: string;
  description: string;
  isComplete: boolean;
};

const toneOptions = [
  { key: 'professional', label: 'Professionnel', description: 'Corporate, analytique' },
  { key: 'friendly', label: 'Chaleureux', description: 'Relationnel, empathique' },
  { key: 'impactful', label: 'Impactant', description: 'Direct, orienté ROI' },
  { key: 'storytelling', label: 'Storytelling', description: 'Narratif, immersif' },
  { key: 'executive', label: 'Executive', description: 'Stratégique, vision business' },
] as const;

const languageOptions = [
  { key: 'fr', label: 'FR', description: 'Lettre en français' },
  { key: 'en', label: 'EN', description: 'Lettre en anglais' },
] as const;

export function LetterGenerator() {
  const router = useRouter();
  const { showToast } = useToast();
  const [context, setContext] = useState<LettersContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [letter, setLetter] = useState('');
  const [letterDraft, setLetterDraft] = useState('');
  const [letterDraftId, setLetterDraftId] = useState<string | null>(null);
  const [editingMarkdown, setEditingMarkdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [openStep, setOpenStep] = useState<StepId>('brief');
  const [pdfFallbackOpen, setPdfFallbackOpen] = useState(false);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: '',
      company: '',
      hiringManager: '',
      tone: 'professional',
      language: 'fr',
      highlights: ['', ''],
      alignmentHooks: [''],
      resumeSummary: '',
    },
  });

  const highlightsArray = useFieldArray({
    control: form.control,
    name: 'highlights',
  });
  const hooksArray = useFieldArray({
    control: form.control,
    name: 'alignmentHooks',
  });

  const refreshContext = useCallback(async () => {
    setContextError(null);
    try {
      const response = await fetch('/api/letters/context');
      if (!response.ok) throw new Error('Impossible de charger le contexte Letters');
      const payload = (await response.json()) as LettersContext;
      const parsed = contextSchema.safeParse(payload);
      if (!parsed.success) throw new Error('Contexte Letters invalide');
      setContext(parsed.data);
      if (parsed.data.resume?.summary) {
        form.setValue('resumeSummary', parsed.data.resume.summary);
      }
    } catch (error) {
      console.error('[LETTERS_CONTEXT]', error);
      const message = error instanceof Error ? error.message : 'Erreur de chargement du contexte';
      setContextError(message);
      showToast({
        title: 'Contexte Letters indisponible',
        description: message,
        variant: 'error',
      });
    }
  }, [form, showToast]);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  const matches = useMemo(() => context?.matches ?? [], [context?.matches]);
  const letterDrafts = useMemo(() => context?.letterDrafts ?? [], [context?.letterDrafts]);

  const highlightSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    matches.forEach((match) => {
      match.requiredSkills.slice(0, 4).forEach((skill) => {
        suggestions.add(`Impact mesurable sur ${skill.toLowerCase()}`);
      });
    });
    context?.resume?.skills?.slice(0, 6).forEach((skill) => {
      suggestions.add(`Expertise solide en ${skill.toLowerCase()}`);
    });
    return Array.from(suggestions).slice(0, 8);
  }, [matches, context?.resume?.skills]);

  const alignmentSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    matches.forEach((match) => {
      suggestions.add(`Votre mission ${match.title.toLowerCase()} résonne avec ma trajectoire récente.`);
    });
    if (context?.resume?.summary) {
      suggestions.add('Vos valeurs de leadership rejoignent ma vision people-first.');
      suggestions.add('Votre rythme d’exécution me permettrait de démultiplier mes impacts observés récemment.');
    }
    return Array.from(suggestions).slice(0, 6);
  }, [matches, context?.resume?.summary]);

  const watchJobTitle = form.watch('jobTitle');
  const watchCompany = form.watch('company');
  const watchLanguage = form.watch('language');
  const watchTone = form.watch('tone');
  const watchHighlights = form.watch('highlights');
  const watchResumeSummary = form.watch('resumeSummary');

  const steps: StepDefinition[] = [
    {
      id: 'brief',
      title: 'Brief du poste',
      description: 'Titre, entreprise et trajectoires Aube pertinentes.',
      isComplete: Boolean(watchJobTitle?.trim() && watchCompany?.trim()),
    },
    {
      id: 'positioning',
      title: 'Positionnement & ton',
      description: 'Style d’écriture, langue et accroches d’alignement.',
      isComplete: Boolean(watchLanguage && watchTone),
    },
    {
      id: 'arguments',
      title: 'Arguments clés',
      description: 'Sélectionnez vos preuves et résultats différenciants.',
      isComplete: (watchHighlights ?? []).filter((item) => item && item.trim().length > 0).length >= 2,
    },
    {
      id: 'synthesis',
      title: 'Storyline de la lettre',
      description: 'Consolidez votre résumé CV Phoenix pour contextualiser.',
      isComplete: Boolean(watchResumeSummary?.trim().length && watchResumeSummary.trim().length >= 20),
    },
  ];

  function autofillFromMatch(matchId?: string) {
    const match = matches.find((item) => item.id === matchId) ?? matches[0];
    if (!match) return;
    form.setValue('jobTitle', match.title, { shouldValidate: true });
    const fills = match.requiredSkills.slice(0, 3).map((skill) => `Expérience confirmée en ${skill.toLowerCase()}`);
    highlightsArray.replace(fills.length ? fills : ['', '']);
    showToast({
      title: 'Champs préremplis',
      description: 'Poste ciblé et arguments mis à jour depuis vos recommandations Aube.',
      variant: 'info',
    });
  }

  function addHighlightSuggestion(value: string) {
    const current = form.getValues('highlights') ?? [];
    if (current.some((item) => item?.trim() === value.trim())) return;
    const emptyIndex = current.findIndex((item) => !item || item.trim().length === 0);
    if (emptyIndex >= 0) {
      form.setValue(`highlights.${emptyIndex}`, value, { shouldValidate: true });
    } else {
      highlightsArray.append(value);
    }
  }

  function addAlignmentSuggestion(value: string) {
    const current = form.getValues('alignmentHooks') ?? [];
    if (current.some((item) => item?.trim() === value.trim())) return;
    const emptyIndex = current.findIndex((item) => !item || item.trim().length === 0);
    if (emptyIndex >= 0) {
      form.setValue(`alignmentHooks.${emptyIndex}`, value, { shouldValidate: true });
    } else {
      hooksArray.append(value);
    }
  }

  async function handleGenerate(values: FormValues) {
    setLoading(true);
    try {
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer la lettre');
      }
      const data = (await response.json()) as GenerationResponse;
      setLetter(data.content);
      setLetterDraft(data.content);
      setLetterDraftId(data.draftId ?? null);
      setEditingMarkdown(false);
      showToast({
        title: 'Lettre générée',
        description: 'Contenu sauvegardé et prêt pour vos ajustements.',
        variant: 'success',
      });
      await refreshContext();
    } catch (error) {
      console.error('[LETTER_GENERATE]', error);
      const message = error instanceof Error ? error.message : 'Erreur interne';
      showToast({ title: 'Échec de génération', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!letterDraftId) {
      showToast({
        title: 'Aucun brouillon actif',
        description: 'Générez une lettre avant de la sauvegarder.',
        variant: 'info',
      });
      return;
    }
    setSaveLoading(true);
    try {
      const payload: NotesPayload = { draftId: letterDraftId, content: letterDraft.trim() };
      const response = await fetch('/api/letters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de sauvegarder la lettre');
      }
      setLetter(letterDraft);
      setEditingMarkdown(false);
      await refreshContext();
      showToast({ title: 'Brouillon mis à jour', variant: 'success' });
    } catch (error) {
      console.error('[LETTER_SAVE]', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      showToast({ title: 'Sauvegarde impossible', description: message, variant: 'error' });
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleLoadDraft(id: string) {
    try {
      const response = await fetch(`/api/letters?draftId=${id}`);
      if (!response.ok) throw new Error('Impossible de charger ce brouillon');
      const data = await response.json();
      if (!data?.draft) throw new Error('Brouillon introuvable');
      type DraftInput = Partial<FormValues> & { highlights?: string[]; alignmentHooks?: string[] };
      const draft = data.draft as { content: { letterMarkdown?: string; input?: DraftInput } };
      const content = draft.content ?? {};
      const input = content.input ?? {};
      form.reset({
        jobTitle: input.jobTitle ?? '',
        company: input.company ?? '',
        hiringManager: input.hiringManager ?? '',
        tone: input.tone ?? 'professional',
        language: input.language ?? 'fr',
        highlights: input.highlights ?? ['', ''],
        alignmentHooks: input.alignmentHooks ?? [''],
        resumeSummary: input.resumeSummary ?? '',
      });
      highlightsArray.replace(input.highlights ?? ['', '']);
      hooksArray.replace(input.alignmentHooks ?? ['']);
      const markdown = content.letterMarkdown ?? '';
      setLetter(markdown);
      setLetterDraft(markdown);
      setLetterDraftId(id);
      setEditingMarkdown(false);
      showToast({
        title: 'Brouillon chargé',
        description: 'Ajustez le contenu ou exportez directement.',
        variant: 'info',
      });
    } catch (error) {
      console.error('[LETTER_LOAD]', error);
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement du brouillon';
      showToast({ title: 'Chargement impossible', description: message, variant: 'error' });
    }
  }

  async function handleExportPDF() {
    if (!letter) {
      showToast({
        title: 'Aucun contenu à exporter',
        description: 'Générez une lettre avant de créer le PDF.',
        variant: 'info',
      });
      return;
    }
    setExportLoading(true);
    try {
      const response = await fetch('/api/letters/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter, draftId: letterDraftId ?? undefined }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer le PDF');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `phoenix-letter-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast({ title: 'PDF généré', description: 'Téléchargement lancé avec succès.', variant: 'success' });
    } catch (error) {
      console.error('[LETTER_EXPORT]', error);
      const message = error instanceof Error ? error.message : "Une erreur est survenue lors de l'export.";
      showToast({ title: 'Export impossible', description: message, variant: 'error' });
      if (/CHROMIUM_PATH/i.test(message) || /chromium/i.test(message)) {
        setPdfErrorMessage(message);
        setPdfFallbackOpen(true);
      }
    } finally {
      setExportLoading(false);
    }
  }

  function resetLetter() {
    form.reset();
    highlightsArray.replace(['', '']);
    hooksArray.replace(['']);
    setLetter('');
    setLetterDraft('');
    setLetterDraftId(null);
    setEditingMarkdown(false);
    showToast({ title: 'Formulaire réinitialisé', variant: 'info' });
  }

  function closePdfFallback() {
    setPdfFallbackOpen(false);
    setPdfErrorMessage(null);
  }

  const previewMarkdown = editingMarkdown ? letterDraft : letter;

  function renderStepContent(step: StepId) {
    switch (step) {
      case 'brief':
        return (
          <div className="space-y-5">
            {matches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
                  <span>Trajectoires Aube</span>
                  <Button type="button" variant="ghost" className="text-xs" onClick={() => autofillFromMatch()}>
                    Pré-remplir automatiquement
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => autofillFromMatch(match.id)}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left text-xs transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
                    >
                      <div className="flex items-center justify-between text-white">
                        <span className="font-semibold">{match.title}</span>
                        <Badge className="border-emerald-400/40 text-emerald-200">{Math.round(match.compatibilityScore)}%</Badge>
                      </div>
                      <p className="mt-2 text-white/50">Skills : {match.requiredSkills.slice(0, 3).join(', ')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Poste ciblé</label>
                <Input placeholder="Ex : Product Marketing Manager" {...form.register('jobTitle')} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Entreprise</label>
                <Input placeholder="Nom de l’entreprise" {...form.register('company')} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Contact (facultatif)</label>
              <Input placeholder="Ex : Madame Dupont — VP Marketing" {...form.register('hiringManager')} />
            </div>
          </div>
        );
      case 'positioning':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Langue</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.key}
                    type="button"
                    onClick={() => form.setValue('language', lang.key)}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-left text-xs transition',
                      watchLanguage === lang.key
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/60',
                    )}
                  >
                    <div className="flex items-center justify-between text-white">
                      <span className="font-semibold">{lang.label}</span>
                      {watchLanguage === lang.key && <BadgeCheck className="h-4 w-4 text-emerald-300" />}
                    </div>
                    <p className="mt-1 text-white/50">{lang.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Tone</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {toneOptions.map((tone) => (
                  <button
                    key={tone.key}
                    type="button"
                    onClick={() => form.setValue('tone', tone.key)}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-left text-xs transition',
                      watchTone === tone.key
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/60',
                    )}
                  >
                    <div className="flex items-center justify-between text-white">
                      <span className="font-semibold">{tone.label}</span>
                      {watchTone === tone.key && <BadgeCheck className="h-4 w-4 text-emerald-300" />}
                    </div>
                    <p className="mt-1 text-white/50">{tone.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Hooks culturels</label>
                <Button type="button" variant="ghost" className="text-xs" onClick={() => hooksArray.append('')}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {alignmentSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addAlignmentSuggestion(suggestion)}
                    className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition hover:border-emerald-400/60 hover:text-emerald-200"
                  >
                    <Lightbulb className="h-3.5 w-3.5" /> {suggestion}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {hooksArray.fields.map((field, index) => (
                  <Input
                    key={field.id}
                    placeholder="Ex : Votre approche people-first résonne avec mon style de management"
                    {...form.register(`alignmentHooks.${index}` as const)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case 'arguments':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Highlights</label>
              <Button type="button" variant="ghost" className="text-xs" onClick={() => highlightsArray.append('')}>
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {highlightSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addHighlightSuggestion(suggestion)}
                  className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition hover:border-emerald-400/60 hover:text-emerald-200"
                >
                  <Lightbulb className="h-3.5 w-3.5" /> {suggestion}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {highlightsArray.fields.map((field, index) => (
                <Input
                  key={field.id}
                  placeholder="Ex : Pilotage d’un lancement produit européen"
                  {...form.register(`highlights.${index}` as const)}
                />
              ))}
            </div>
          </div>
        );
      case 'synthesis':
        return (
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Résumé CV Phoenix</label>
            <Textarea
              rows={5}
              placeholder="Résumez vos forces, secteurs clés, preuves chiffrées."
              {...form.register('resumeSummary')}
            />
            {context?.resume?.summary && (
              <p className="text-[11px] text-white/40">
                Dernière synchronisation CV détectée. Ajoutez des preuves chiffrées ou éléments récents pour contextualiser.
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-semibold text-white">Letters — Studio de motivation</h2>
          <p className="text-sm text-white/60">Préparez des lettres alignées sur vos trajectoires et votre CV Phoenix.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          IA contextualisée • Historique versionné • Exports PDF
        </div>
      </div>

      {contextError && (
        <div className="rounded-3xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
          {contextError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.35fr,1fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Progression de préparation</CardTitle>
            <CardDescription>Suivez vos sections et complétez-les une par une.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {steps.map((step, index) => {
                const isActive = openStep === step.id;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => setOpenStep(step.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                        isActive ? 'border-emerald-400/60 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-white/60',
                      )}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{step.title}</p>
                        <p className="text-xs text-white/50">{step.description}</p>
                      </div>
                      {step.isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Configurer la lettre</CardTitle>
              <CardDescription>Saisissez les éléments prioritaires avant de générer.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
                {steps.map((step, index) => {
                  const isOpen = openStep === step.id;
                  return (
                    <section key={step.id} className="rounded-3xl border border-white/10 bg-black/20">
                      <button
                        type="button"
                        onClick={() => setOpenStep(step.id)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      >
                        <div>
                          <span className="text-[11px] uppercase tracking-wide text-white/40">Étape {index + 1}</span>
                          <p className="text-sm font-semibold text-white">{step.title}</p>
                          <p className="text-xs text-white/50">{step.description}</p>
                        </div>
                        <ChevronDown className={cn('h-4 w-4 text-white transition', isOpen ? 'rotate-180' : '')} />
                      </button>
                      {isOpen && <div className="space-y-5 border-t border-white/10 px-5 py-5">{renderStepContent(step.id)}</div>}
                    </section>
                  );
                })}

                <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/50">
                  <Button type="button" variant="ghost" onClick={resetLetter}>
                    <RefreshCw className="h-4 w-4" /> Réinitialiser
                  </Button>
                  <Button type="submit" loading={loading}>
                    Générer la lettre
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/50">
            <CardHeader>
              <CardTitle>Aperçu et actions</CardTitle>
              <CardDescription>Modifiez la lettre, exportez-la ou envoyez-la à Luna.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {letter ? (
                <>
                  {editingMarkdown ? (
                    <Textarea
                      value={letterDraft}
                      onChange={(event) => setLetterDraft(event.target.value)}
                      rows={18}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <article
                      className="prose prose-invert max-w-none whitespace-pre-wrap text-white/80"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(previewMarkdown) }}
                    />
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Button type="button" variant="secondary" onClick={handleSaveDraft} loading={saveLoading}>
                      Sauvegarder
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingMarkdown((prev) => !prev)}>
                      {editingMarkdown ? 'Voir aperçu' : 'Modifier le Markdown'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleExportPDF} disabled={exportLoading}>
                      {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => router.push('/luna')}>
                      Envoyer à Luna
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/50">Remplissez le formulaire pour générer une lettre cohérente avec votre parcours.</p>
              )}

              {letterDrafts.length > 0 && (
                <div className="space-y-2 text-xs text-white/60">
                  <span className="text-sm font-semibold text-white">Brouillons récents</span>
                  {letterDrafts.map((draft) => (
                    <div key={draft.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between text-white">
                        <span>{draft.title ?? 'Lettre sans titre'}</span>
                        {draft.alignScore !== null && <Badge className="border-emerald-400/40 text-emerald-200">Score {Math.round(draft.alignScore)}%</Badge>}
                      </div>
                      <p className="text-[11px] text-white/40">{new Date(draft.updatedAt).toLocaleString()}</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" variant="secondary" className="text-xs" onClick={() => handleLoadDraft(draft.id)}>
                          Charger ce brouillon
                        </Button>
                        <Button type="button" variant="ghost" className="text-xs" onClick={() => router.push(`/luna?letterDraft=${draft.id}`)}>
                          Envoyer à Luna
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {pdfFallbackOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-lg space-y-5 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={closePdfFallback}
              className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Configurer CHROMIUM_PATH</h3>
              <p className="text-sm text-white/70">
                Phoenix utilise Chromium headless pour générer les exports PDF. Renseignez la variable d’environnement
                <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">CHROMIUM_PATH</code> pour pointer vers votre exécutable Chromium.
              </p>
            </div>
            {pdfErrorMessage && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                {pdfErrorMessage}
              </div>
            )}
            <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
              <li>
                Installer Chromium si nécessaire (exemple macOS) :
                <code className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs">brew install chromium</code>
              </li>
              <li>
                Ajouter dans <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs">.env.local</code> :
                <code className="ml-2 block rounded bg-white/10 px-1.5 py-0.5 text-xs">{`CHROMIUM_PATH="/chemin/vers/votre/chromium"`}</code>
              </li>
              <li>
                Relancer le serveur Next.js pour appliquer la configuration :
                <code className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs">npm run dev</code>
              </li>
            </ol>
            <p className="text-xs text-white/40">
              Exemples de chemins : macOS <code className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">/Applications/Chromium.app/Contents/MacOS/Chromium</code> •
              Linux <code className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">/usr/bin/chromium</code>.
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={closePdfFallback}>
                Compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function markdownToHtml(markdown: string) {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '<br />');
}
