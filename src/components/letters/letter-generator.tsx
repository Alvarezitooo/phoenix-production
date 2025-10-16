'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link'; // Importation ajoutée
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
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
  Zap, // Importation ajoutée
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/toast';
import { LunaAssistHint } from '@/components/luna/luna-assist-hint';
import { logLunaInteraction } from '@/utils/luna-analytics';
import { LETTER_RUNES, type LetterRune } from '@/config/letters';
import { ENERGY_COSTS, LETTER_PUBLICATION_COST } from '@/config/energy';

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
        mirror: z
          .object({
            text: z.string(),
            keywords: z.array(z.string()),
            emotions: z.array(z.string()),
            energyPulse: z.string().nullable(),
            rune: z
              .object({
                id: z.string(),
                label: z.string(),
                confidence: z.number().nullable(),
              })
              .nullable(),
          })
          .nullable(),
        publication: z
          .object({
            id: z.string(),
            status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
            moderatedAt: z.string().nullable(),
            moderatorNote: z.string().nullable(),
            publishedAt: z.string().nullable(),
          })
          .nullable(),
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
  tone: z.enum(['professional', 'friendly', 'impactful', 'storytelling', 'executive']),
  language: z.enum(['fr', 'en']),
  highlights: z.array(z.string().min(3)).min(2),
  alignmentHooks: z.array(z.string().min(3)).default([]),
  resumeSummary: z.string().min(20),
});

type FormValues = {
  jobTitle: string;
  company: string;
  hiringManager?: string;
  tone: 'professional' | 'friendly' | 'impactful' | 'storytelling' | 'executive';
  language: 'fr' | 'en';
  highlights: string[];
  alignmentHooks: string[];
  resumeSummary: string;
};

type NotesPayload = {
  draftId: string;
  content: string;
  mirror?: MirrorPersistPayload | null;
};

type StepId = 'brief' | 'positioning' | 'arguments' | 'synthesis';

type StepDefinition = {
  id: StepId;
  title: string;
  description: string;
  isComplete: boolean;
};

type MirrorState = {
  mirror: string;
  keywords: string[];
  emotionalSpectrum: string[];
  energyPulse: string | null;
  rune: {
    data: LetterRune;
    confidence: number;
    matchedKeywords: string[];
  } | null;
};

type MirrorPersistPayload = {
  mirrorText: string;
  keywords: string[];
  emotions: string[];
  energyPulse: string | null;
  rune: { id: string; confidence: number } | null;
};

const PUBLICATION_STATUS_LABEL: Record<'PENDING' | 'APPROVED' | 'REJECTED', string> = {
  PENDING: 'En modération',
  APPROVED: 'Publié',
  REJECTED: 'Rejetée',
};

const PUBLICATION_STATUS_CLASS: Record<'PENDING' | 'APPROVED' | 'REJECTED', string> = {
  PENDING: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  APPROVED: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  REJECTED: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
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
  const [mirrorState, setMirrorState] = useState<MirrorState | null>(null);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [mirrorError, setMirrorError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [publishDraft, setPublishDraft] = useState<(LettersContext['letterDrafts'][number] & { index?: number }) | null>(null);
  const [publishExcerpt, setPublishExcerpt] = useState('');
  const [publishAnonymous, setPublishAnonymous] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showEnergyModal, setShowEnergyModal] = useState(false); // État pour la modale d'énergie

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      jobTitle: '',
      company: '',
      hiringManager: '',
      tone: 'professional',
      language: 'fr',
      highlights: ['', ''],
      alignmentHooks: [],
      resumeSummary: '',
    },
  });

  // React Hook Form struggles to infer array paths on our manual FormValues shape, so coerce the field names.
  const highlightsArray = useFieldArray<FormValues>({
    control: form.control,
    name: 'highlights' as never,
  });
  const hooksArray = useFieldArray<FormValues>({
    control: form.control,
    name: 'alignmentHooks' as never,
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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 320);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const openLunaForLetter = useCallback(() => {
    const values = form.getValues();
    const highlights = (values.highlights ?? []).filter((item) => item && item.trim().length > 0).join(' | ');
    const prompt = `Tu es Luna, copywriter carrière. Poste: ${values.jobTitle || 'à préciser'} chez ${
      values.company || 'entreprise à préciser'
    } (ton ${values.tone}). Résumé: ${values.resumeSummary || 'non renseigné'}. Highlights: ${
      highlights || 'non renseignés'
    }. Propose 3 angles d'ouverture et 3 arguments clés pour personnaliser ma lettre.`;
    window.dispatchEvent(new CustomEvent('phoenix:luna-open', { detail: { prompt, source: 'letters_builder' } }));
    showToast({
      title: 'Luna se prépare',
      description: 'La conversation reprend avec votre contexte lettre.',
      variant: 'info',
    });
    logLunaInteraction('letter_brief_luna', {
      hasHighlights: Boolean(highlights),
      jobTitle: values.jobTitle,
      company: values.company,
    });
  }, [form, showToast]);

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

  function applyKeywordAsHighlight(value: string) {
    if (!value) return;
    addHighlightSuggestion(value);
    showToast({
      title: 'Argument ajouté',
      description: `« ${value} » a été ajouté à tes preuves.`,
      variant: 'success',
    });
  }

  function applyKeywordAsAlignment(value: string) {
    if (!value) return;
    addAlignmentSuggestion(value);
    showToast({
      title: 'Hook ajouté',
      description: `Accroche « ${value} » disponible pour ton alignement.`,
      variant: 'success',
    });
  }

  function buildMirrorPayload(state: MirrorState | null): MirrorPersistPayload | null {
    if (!state) return null;
    return {
      mirrorText: state.mirror,
      keywords: state.keywords,
      emotions: state.emotionalSpectrum,
      energyPulse: state.energyPulse ?? null,
      rune: state.rune
        ? {
            id: state.rune.data.id,
            confidence: state.rune.confidence,
          }
        : null,
    };
  }

  async function handleMirrorRequest() {
    const values = form.getValues();
    if (!values.jobTitle?.trim() || !values.company?.trim()) {
      showToast({
        title: 'Brief incomplet',
        description: 'Ajoute un poste et une entreprise avant de demander le miroir.',
        variant: 'info',
      });
      return;
    }
    if (!values.resumeSummary || values.resumeSummary.trim().length < 20) {
      showToast({
        title: 'Résumé requis',
        description: 'Ton miroir a besoin d’un résumé de parcours plus précis.',
        variant: 'info',
      });
      return;
    }
    const highlights = (values.highlights ?? []).filter((item) => item && item.trim().length >= 3);
    if (highlights.length === 0) {
      showToast({
        title: 'Arguments manquants',
        description: 'Ajoute au moins un highlight avant de lancer le miroir.',
        variant: 'info',
      });
      return;
    }

    setMirrorLoading(true);
    setMirrorError(null);
    try {
      const response = await fetch('/api/letters/mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: values.jobTitle,
          company: values.company,
          tone: values.tone,
          language: values.language,
          highlights,
          resumeSummary: values.resumeSummary,
        }),
      });

      if (response.status === 402) {
        // Intercepte l'erreur d'énergie insuffisante
        setShowEnergyModal(true);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? 'Miroir indisponible');
      }

      const payload = (await response.json()) as {
        mirror: string;
        keywords: string[];
        emotionalSpectrum: string[];
        energyPulse: string | null;
        rune: {
          id: LetterRune['id'];
          label: string;
          description: string;
          confidence: number;
          matchedKeywords: string[];
        } | null;
      };

      const runeData = payload.rune ? LETTER_RUNES.find((item) => item.id === payload.rune?.id) ?? null : null;

      setMirrorState({
        mirror: payload.mirror,
        keywords: payload.keywords,
        emotionalSpectrum: payload.emotionalSpectrum,
        energyPulse: payload.energyPulse,
        rune:
          payload.rune && runeData
            ? {
                data: runeData,
                confidence: payload.rune.confidence,
                matchedKeywords: payload.rune.matchedKeywords,
              }
            : null,
      });

      showToast({ title: 'Miroir Luna', description: 'Reflet empathique généré.', variant: 'info' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur miroir';
      setMirrorError(message);
      showToast({ title: 'Miroir indisponible', description: message, variant: 'error' });
    } finally {
      setMirrorLoading(false);
    }
  }

  async function handleGenerate(values: FormValues) {
    setLoading(true);
    try {
      const mirrorPayload = buildMirrorPayload(mirrorState);
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          mirror: mirrorPayload ?? undefined,
        }),
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
      const mirrorPayload = buildMirrorPayload(mirrorState);
      const payload: NotesPayload & { mirror?: MirrorPersistPayload | null } = {
        draftId: letterDraftId,
        content: letterDraft.trim(),
        mirror: mirrorPayload,
      };
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
      const draft = data.draft as {
        content: { letterMarkdown?: string; input?: DraftInput };
        mirrorText?: string | null;
        mirrorKeywords?: string[] | null;
        mirrorEmotions?: string[] | null;
        mirrorEnergyPulse?: string | null;
        runeId?: string | null;
        runeConfidence?: number | null;
      };
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
      const runeData = draft.runeId ? LETTER_RUNES.find((item) => item.id === draft.runeId) ?? null : null;
      setMirrorState(
        draft.mirrorText
          ? {
              mirror: draft.mirrorText,
              keywords: draft.mirrorKeywords ?? [],
              emotionalSpectrum: draft.mirrorEmotions ?? [],
              energyPulse: draft.mirrorEnergyPulse ?? null,
              rune:
                draft.runeId && runeData
                  ? {
                      data: runeData,
                      confidence: draft.runeConfidence ?? 0.6,
                      matchedKeywords: draft.mirrorKeywords ?? [],
                    }
                  : null,
            }
          : null,
      );
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
    setMirrorState(null);
    setMirrorError(null);
    setMirrorLoading(false);
    showToast({ title: 'Formulaire réinitialisé', variant: 'info' });
  }

  function closePdfFallback() {
    setPdfFallbackOpen(false);
    setPdfErrorMessage(null);
  }

  function openPublishDialog(draft: LettersContext['letterDrafts'][number]) {
    if (!draft.mirror) {
      showToast({
        title: 'Miroir requis',
        description: 'Génère un miroir Luna avant de proposer ta lettre à la galerie.',
        variant: 'info',
      });
      return;
    }
    if (draft.publication?.status === 'PENDING') {
      showToast({
        title: 'Déjà en revue',
        description: 'Cette lettre est actuellement en modération. Tu seras notifié une fois validée.',
        variant: 'info',
      });
      return;
    }
    if (draft.publication?.status === 'APPROVED') {
      showToast({
        title: 'Lettre publiée',
        description: 'Cette lettre est déjà visible dans la galerie.',
        variant: 'success',
      });
      return;
    }
    setPublishDraft(draft);
    const baseExcerpt = draft.mirror.text ?? '';
    const trimmed = baseExcerpt.slice(0, 260);
    setPublishExcerpt(trimmed);
    setPublishAnonymous(true);
    setPublishError(null);
  }

  function closePublishDialog() {
    setPublishDraft(null);
    setPublishExcerpt('');
    setPublishLoading(false);
    setPublishError(null);
  }

  async function handlePublishConfirm() {
    if (!publishDraft) return;
    if (!publishDraft.mirror) {
      setPublishError('Le miroir Luna est requis pour cette lettre.');
      return;
    }
    if (!publishExcerpt || publishExcerpt.trim().length < 40) {
      setPublishError('Propose un extrait d’au moins 40 caractères.');
      return;
    }
    setPublishLoading(true);
    setPublishError(null);
    try {
      const response = await fetch('/api/letters/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: publishDraft.id,
          excerpt: publishExcerpt.trim(),
          anonymous: publishAnonymous,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? 'Publication indisponible');
      }
      showToast({
        title: 'Lettre envoyée',
        description: 'Ta lettre passe en revue avant apparition dans la galerie.',
        variant: 'success',
      });
      closePublishDialog();
      await refreshContext();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la publication';
      setPublishError(message);
    } finally {
      setPublishLoading(false);
    }
  }

  const previewMarkdown = editingMarkdown ? letterDraft : letter;

  function renderStepContent(step: StepId) {
    switch (step) {
      case 'brief':
        return (
          <div className="space-y-5">
            {matches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
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
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Poste ciblé</label>
                <Input placeholder="Ex : Product Marketing Manager" {...form.register('jobTitle')} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Entreprise</label>
                <Input placeholder="Nom de l’entreprise" {...form.register('company')} />
              </div>
            </div>

            <LunaAssistHint
              helper="Luna peut t’aider à clarifier le rôle ciblé ou à identifier 2 attentes clés de l’entreprise."
              getPrompt={() =>
                `Tu es Luna, coach carrière. Poste : ${
                  form.getValues('jobTitle') || 'non précisé'
                } chez ${form.getValues('company') || 'entreprise à préciser'}. Donne-moi deux attentes probables du recruteur et une question à poser.`
              }
              source="letters_brief"
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Contact (facultatif)</label>
              <Input placeholder="Ex : Madame Dupont — VP Marketing" {...form.register('hiringManager')} />
            </div>
          </div>
        );
      case 'positioning':
        return (
          <div className="space-y-5">
            <LunaAssistHint
              helper="Besoin d’inspiration sur le ton ? Luna suggère des angles adaptés au poste."
              getPrompt={() =>
                `Tu es Luna, copywriter. Poste: ${form.getValues('jobTitle') || 'à préciser'} chez ${
                  form.getValues('company') || 'entreprise à préciser'
                }. Quel ton adopter et quelles accroches culturelles proposer ? Donne deux recommandations.`
              }
              source="letters_positioning"
            />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Langue</label>
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
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Tone</label>
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
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Hooks culturels</label>
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

            <div className="space-y-3">
              <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-white/60">Miroir Luna</span>
                  <Button type="button" variant="ghost" loading={mirrorLoading} onClick={() => void handleMirrorRequest()} className="text-xs">
                    Recevoir le reflet
                  </Button>
                </div>
                {mirrorState ? (
                  <div className="space-y-3">
                    <p className="text-sm text-white/80 leading-relaxed">{mirrorState.mirror}</p>
                    {mirrorState.energyPulse && <p className="text-xs italic text-emerald-200">{mirrorState.energyPulse}</p>}
                    <div className="flex flex-wrap gap-2">
                      {mirrorState.keywords.map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          onClick={() => applyKeywordAsHighlight(keyword)}
                          className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100 transition hover:bg-emerald-400/20"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-white/50">
                      {mirrorState.emotionalSpectrum.map((emotion) => (
                        <span key={emotion} className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          {emotion}
                        </span>
                      ))}
                    </div>
                    {mirrorState.rune && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">Rune {mirrorState.rune.data.label}</p>
                            <p className="mt-1 text-xs text-white/50">{mirrorState.rune.data.description}</p>
                          </div>
                          <Badge className="border-emerald-400/30 text-emerald-200">{Math.round(mirrorState.rune.confidence * 100)}%</Badge>
                        </div>
                        {mirrorState.rune.matchedKeywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {mirrorState.rune.matchedKeywords.map((kw) => (
                              <button
                                key={kw}
                                type="button"
                                onClick={() => applyKeywordAsAlignment(kw)}
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:border-emerald-400/40 hover:text-white"
                              >
                                {kw}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-white/50">
                    Luna peut t’offrir un reflet empathique pour inspirer la lettre. Poste, entreprise et au moins un highlight sont requis.
                  </p>
                )}
                {mirrorError && <p className="text-xs text-rose-300">{mirrorError}</p>}
              </div>
            </div>
          </div>
        );
      case 'arguments':
        return (
          <div className="space-y-4">
            <LunaAssistHint
              helper="Demande à Luna de transformer une preuve en argument percutant."
              getPrompt={() =>
                `Tu es Luna. Aide-moi à transformer ces highlights en arguments convaincants pour ma lettre : ${
                  (form.getValues('highlights') ?? []).filter(Boolean).join(' | ') || 'aucun highlight saisi'
                }. Propose 3 reformulations centrées sur l’impact.`
              }
              source="letters_arguments"
            />
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Highlights</label>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Résumé CV Phoenix</label>
            <LunaAssistHint
              helper="Luna peut extraire 3 bullets clés de votre résumé." 
              getPrompt={() =>
                `Tu es Luna. Résumé de mon CV : ${
                  form.getValues('resumeSummary') || 'Pas encore de résumé'
                }. Génère 3 bullets percutants pour alimenter ma lettre de motivation.`
              }
              source="letters_synthesis"
            />
            <Textarea
              rows={5}
              placeholder="Résumez vos forces, secteurs clés, preuves chiffrées."
              {...form.register('resumeSummary')}
            />
            {context?.resume?.summary && (
              <p className="text-[11px] text-white/60">
                Dernière synchronisation CV détectée. Ajoutez des preuves chiffrées ou éléments récents pour contextualiser.
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      {/* Modale pour l'énergie insuffisante */}
      {showEnergyModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-lg space-y-5 rounded-3xl border border-yellow-500/50 bg-slate-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowEnergyModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-yellow-400/90">
                <Zap className="h-4 w-4" /> Énergie insuffisante
              </p>
              <h3 className="text-lg font-semibold text-white">Il vous manque quelques points d'énergie pour continuer.</h3>
              <p className="text-sm text-white/60">
                Chaque action assistée par Luna consomme de l'énergie. Vous pouvez en obtenir plus via les packs ou en complétant des rituels.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 text-sm">
              <Button type="button" variant="ghost" onClick={() => setShowEnergyModal(false)}>
                Plus tard
              </Button>
              <Button type="button" asChild>
                <Link href="/energy">Recharger l'énergie</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-semibold text-white">Letters — Studio de motivation</h2>
          <p className="text-sm text-white/60">Préparez des lettres alignées sur vos trajectoires et votre CV Phoenix.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            IA contextualisée • Historique versionné • Exports PDF
          </span>
          <Button type="button" variant="ghost" className="text-xs" onClick={openLunaForLetter}>
            Briefer Luna
          </Button>
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
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Configurer la lettre</CardTitle>
                <CardDescription>Saisissez les éléments prioritaires avant de générer.</CardDescription>
              </div>
              <Button type="button" variant="ghost" className="text-xs" onClick={openLunaForLetter}>
                <Sparkles className="h-4 w-4" /> Briefer Luna
              </Button>
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
                          <span className="text-[11px] uppercase tracking-wide text-white/60">Étape {index + 1}</span>
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
                    <Button type="button" variant="ghost" onClick={openLunaForLetter}>
                      Débriefer avec Luna
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-sm text-white/50">
                  <p>Remplissez le formulaire pour générer une lettre cohérente avec votre parcours.</p>
                  <Button type="button" variant="ghost" className="text-xs" onClick={openLunaForLetter}>
                    Briefer Luna
                  </Button>
                </div>
              )}

              {letterDrafts.length > 0 && (
                <div className="space-y-2 text-xs text-white/60">
                  <span className="text-sm font-semibold text-white">Brouillons récents</span>
                  {letterDrafts.map((draft) => {
                    const status = draft.publication?.status ?? null;
                    const statusLabel = status ? PUBLICATION_STATUS_LABEL[status] : null;
                    const statusClasses = status ? PUBLICATION_STATUS_CLASS[status] : '';
                    const isPublishDisabled = status === 'PENDING' || status === 'APPROVED';

                    return (
                      <div key={draft.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex flex-col gap-3 text-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1">
                              <span>{draft.title ?? 'Lettre sans titre'}</span>
                              {draft.mirror?.rune && (
                                <span className="text-[11px] uppercase tracking-wide text-emerald-200/90">
                                  Rune {draft.mirror.rune.label}
                                </span>
                              )}
                              {statusLabel && (
                                <Badge className={cn('w-fit text-[10px]', statusClasses)}>{statusLabel}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {draft.alignScore !== null && (
                                <Badge className="border-emerald-400/40 text-emerald-200">Score {Math.round(draft.alignScore)}%</Badge>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => openPublishDialog(draft)}
                                loading={publishLoading && publishDraft?.id === draft.id}
                                disabled={isPublishDisabled}
                              >
                                {status === 'APPROVED'
                                  ? 'Publié'
                                  : status === 'PENDING'
                                  ? 'En revue'
                                  : 'Publier'}
                              </Button>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/60">{new Date(draft.updatedAt).toLocaleString()}</p>
                        </div>
                        {draft.mirror && (
                          <p className="mt-2 text-[12px] leading-relaxed text-white/60">
                            {draft.mirror.text.slice(0, 140)}
                            {draft.mirror.text.length > 140 ? '…' : ''}
                          </p>
                        )}
                        {draft.publication?.moderatorNote && draft.publication.status === 'REJECTED' && (
                          <p className="mt-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-[11px] text-rose-100">
                            Note de Luna Ops&nbsp;: {draft.publication.moderatorNote}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Button type="button" variant="secondary" className="text-xs" onClick={() => handleLoadDraft(draft.id)}>
                            Charger ce brouillon
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              const prompt = `Tu es Luna. Relis le brouillon ${draft.title ?? 'sans titre'} (ID ${draft.id}) et propose deux axes d’amélioration.`;
                              window.dispatchEvent(
                                new CustomEvent('phoenix:luna-open', { detail: { prompt, source: 'letters_saved_draft' } }),
                              );
                              showToast({
                                title: 'Luna ouvre le brouillon',
                                description: 'Retrouvez la conversation pour affiner la lettre.',
                                variant: 'info',
                              });
                              logLunaInteraction('letters_saved_draft_luna', { draftId: draft.id });
                            }}
                          >
                            Débriefer avec Luna
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {publishDraft && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="relative w-full max-w-xl space-y-5 rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={closePublishDialog}
              className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-emerald-200/90">Publier dans la constellation</p>
              <h3 className="text-lg font-semibold text-white">{publishDraft.title ?? 'Lettre sans titre'}</h3>
              <p className="text-sm text-white/60">
                Cette action consomme {LETTER_PUBLICATION_COST} points d’énergie. La lettre passe ensuite en modération avant d’apparaître dans la galerie.
              </p>
              {publishDraft.mirror?.rune && (
                <p className="text-xs text-emerald-200/80">
                  Rune dominante : {publishDraft.mirror.rune.label}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Extrait partagé</label>
              <Textarea
                rows={4}
                value={publishExcerpt}
                onChange={(event) => setPublishExcerpt(event.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>{publishExcerpt.trim().length} caractères</span>
                <button
                  type="button"
                  onClick={() => setPublishAnonymous((prev) => !prev)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/70 transition hover:border-emerald-400/40 hover:text-white"
                >
                  {publishAnonymous ? 'Anonyme activé' : 'Afficher mon prénom'}
                </button>
              </div>
            </div>
            {publishError && <p className="text-xs text-rose-300">{publishError}</p>}
            <div className="flex flex-wrap justify-end gap-2 text-sm">
              <Button type="button" variant="ghost" onClick={closePublishDialog}>
                Annuler
              </Button>
              <Button type="button" onClick={() => void handlePublishConfirm()} loading={publishLoading}>
                Publier la lettre
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-xs text-white/60">
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
      {showScrollTop && (
        <Button
          type="button"
          variant="secondary"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-4 z-[55] px-3 py-1.5 text-xs shadow-lg shadow-slate-950/20 md:hidden"
          onClick={scrollToTop}
          aria-label="Revenir en haut de la page"
        >
          Remonter
        </Button>
      )}
    </>
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
