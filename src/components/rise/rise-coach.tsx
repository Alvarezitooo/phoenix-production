'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

const focuses = [
  { key: 'behavioral', label: 'Comportemental' },
  { key: 'strategic', label: 'Stratégique' },
  { key: 'technical', label: 'Technique' },
] as const;

type FocusKey = (typeof focuses)[number]['key'];

type Question = {
  question: string;
  competency: string;
  guidance: string;
};

type RiseContext = {
  resumeSummary: string | null;
  letterSummary: string | null;
  matches: Array<{ id: string; title: string; compatibilityScore: number; requiredSkills: string[] }>;
  sessions: Array<{ id: string; role: string; focus: string; createdAt: string }>;
};

type QuestionResponse = {
  questions: Question[];
  sessionId: string;
};

type NotesState = {
  question: string;
  answer: string;
  takeaway: string;
};

export function RiseCoach() {
  const router = useRouter();
  const [context, setContext] = useState<RiseContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [focus, setFocus] = useState<FocusKey>('behavioral');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notes, setNotes] = useState<NotesState[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const matches = useMemo(() => context?.matches ?? [], [context?.matches]);
  const sessions = useMemo(() => context?.sessions ?? [], [context?.sessions]);
  const resumeSummary = context?.resumeSummary ?? null;
  const letterSummary = context?.letterSummary ?? null;

  const refreshContext = useCallback(async () => {
    setContextError(null);
    try {
      const response = await fetch('/api/rise/context');
      if (!response.ok) throw new Error('Impossible de charger le contexte Rise');
      const data = (await response.json()) as RiseContext;
      setContext(data);
      if (!role && data.resumeSummary) {
        setStatusMessage('Résumé CV importé depuis Phoenix : utilisez-le pour contextualiser vos réponses.');
      }
    } catch (error) {
      console.error('[RISE_CONTEXT]', error);
      setContextError(error instanceof Error ? error.message : 'Erreur de chargement du contexte');
    }
  }, [role]);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  function autofillFromMatch(matchId?: string) {
    const match = matches.find((item) => item.id === matchId) ?? matches[0];
    if (!match) return;
    setRole(match.title);
    setStatusMessage(`Role pré-rempli depuis votre trajectoire ${match.title}.`);
  }

  async function fetchQuestions() {
    if (!role) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/rise/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, focus }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? "Impossible de générer l'atelier");
      }
      const data = (await response.json()) as QuestionResponse;
      setQuestions(data.questions);
      setSessionId(data.sessionId);
      setNotes(
        data.questions.map((question) => ({
          question: question.question,
          answer: '',
          takeaway: '',
        })),
      );
      setStatusMessage('Atelier généré. Entraînez-vous et capturez vos réponses clés.');
    } catch (error) {
      console.error('[RISE_GENERATE]', error);
      setStatusMessage(error instanceof Error ? error.message : 'Erreur interne');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSession(id: string) {
    try {
      const response = await fetch(`/api/rise/sessions/${id}`);
      if (!response.ok) throw new Error('Impossible de charger cette session');
      const payload = (await response.json()) as {
        session?: { id: string; role: string; focus: string; questions: Question[]; notes?: NotesState[] };
      };
      if (!payload.session) throw new Error('Session introuvable');
      const { session: loadedSession } = payload;
      const focusKey = (focuses.find((item) => item.key === loadedSession.focus)?.key ?? 'behavioral') as FocusKey;
      const sessionQuestions = loadedSession.questions ?? [];
      setRole(loadedSession.role);
      setFocus(focusKey);
      setQuestions(sessionQuestions);
      if (loadedSession.notes && loadedSession.notes.length > 0) {
        setNotes(
          loadedSession.notes.map((entry) => ({
            question: entry.question,
            answer: entry.answer ?? '',
            takeaway: entry.takeaway ?? '',
          })),
        );
      } else {
        setNotes(
          sessionQuestions.map((question) => ({
            question: question.question,
            answer: '',
            takeaway: '',
          })),
        );
      }
      setSessionId(loadedSession.id);
      setStatusMessage('Session Rise chargée. Ajustez vos réponses et sauvegardez.');
    } catch (error) {
      console.error('[RISE_SESSION_LOAD]', error);
      setStatusMessage(error instanceof Error ? error.message : 'Erreur lors du chargement de la session');
    }
  }

  async function saveNotes() {
    if (!sessionId) {
      setStatusMessage('Générez une session avant de sauvegarder vos notes.');
      return;
    }
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/rise/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de sauvegarder vos notes');
      }
      setStatusMessage('Notes sauvegardées. Continuez votre entraînement !');
      await refreshContext();
    } catch (error) {
      console.error('[RISE_SAVE]', error);
      setStatusMessage(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSavingNotes(false);
    }
  }

  function resetSession() {
    setRole('');
    setFocus('behavioral');
    setQuestions([]);
    setNotes([]);
    setSessionId(null);
    setStatusMessage('Session réinitialisée. Relancez un atelier pour continuer.');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-3xl font-semibold text-white">Rise — Interview Studio</h2>
          <p className="text-sm text-white/60">Préparez vos réponses de manière structurée, sauvegardez vos entraînements et passez sur Luna.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          Questions IA • Notes personnelles • Historique sessions
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Configurer un atelier</CardTitle>
            <CardDescription>Préremplissez depuis vos matches Aube ou votre CV Phoenix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {contextError && <div className="rounded-3xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">{contextError}</div>}

            {matches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
                  <span>Trajectoires Aube</span>
                  <Button type="button" variant="ghost" className="text-xs" onClick={() => autofillFromMatch()}>
                    Préremplir
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
                      <p className="mt-2 text-white/50">Skills clés : {match.requiredSkills.slice(0, 3).join(', ')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {statusMessage && (
              <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 p-3 text-xs text-indigo-100">{statusMessage}</div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Rôle ciblé</label>
                <Input placeholder="Ex : Head of Product" value={role} onChange={(event) => setRole(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Focus d&apos;entraînement</label>
                <div className="flex gap-2">
                  {focuses.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFocus(item.key)}
                      className={cn(
                        'flex-1 rounded-2xl border px-3 py-2 text-xs transition',
                        focus === item.key ? 'border-emerald-400/60 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-white/60',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/50">
              <Button type="button" variant="ghost" onClick={resetSession}>
                <RefreshCw className="h-4 w-4" /> Réinitialiser
              </Button>
              <Button onClick={fetchQuestions} disabled={!role} loading={loading}>
                Lancer l&apos;atelier
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/50">
          <CardHeader>
            <CardTitle>Préparation</CardTitle>
            <CardDescription>Notez vos réponses, exportez-les vers Luna ou CV Builder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(resumeSummary || letterSummary) && (
              <div className="space-y-3">
                {resumeSummary && (
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white">Résumé CV Phoenix</span>
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 whitespace-pre-wrap">
                      {resumeSummary}
                    </article>
                  </div>
                )}
                {letterSummary && (
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-white">Lettre récente</span>
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 whitespace-pre-wrap">
                      {letterSummary}
                    </article>
                  </div>
                )}
              </div>
            )}

            {sessions.length > 0 && (
              <div className="space-y-2 text-xs text-white/60">
                <span className="text-sm font-semibold text-white">Sessions récentes</span>
                {sessions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between text-white">
                      <span>{item.role || 'Session Rise'}</span>
                      <Badge className="border-emerald-400/40 text-emerald-200">{item.focus}</Badge>
                    </div>
                    <p className="text-[11px] text-white/60">{new Date(item.createdAt).toLocaleString()}</p>
                    <div className="mt-2 flex gap-2">
                      <Button type="button" variant="secondary" className="text-xs" onClick={() => handleLoadSession(item.id)}>
                        Charger cette session
                      </Button>
                      <Button type="button" variant="ghost" className="text-xs" onClick={() => router.push(`/luna?riseSession=${item.id}`)}>
                        Continuer sur Luna
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {questions.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Questions proposées</CardTitle>
            <CardDescription>Structurez vos réponses et sauvegardez vos notes pour les sessions suivantes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.question} className="space-y-3 rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{question.question}</h3>
                  <Badge>{question.competency}</Badge>
                </div>
                <p className="text-xs text-white/60">{question.guidance}</p>
                <Textarea
                  rows={3}
                  placeholder="Votre réponse ou plan de réponse"
                  value={notes[index]?.answer ?? ''}
                  onChange={(event) =>
                    setNotes((current) => {
                      const copy = [...current];
                      copy[index] = {
                        question: question.question,
                        answer: event.target.value,
                        takeaway: copy[index]?.takeaway ?? '',
                      };
                      return copy;
                    })
                  }
                />
                <Textarea
                  rows={2}
                  placeholder="Takeaway / point d&apos;amélioration"
                  value={notes[index]?.takeaway ?? ''}
                  onChange={(event) =>
                    setNotes((current) => {
                      const copy = [...current];
                      copy[index] = {
                        question: question.question,
                        answer: copy[index]?.answer ?? '',
                        takeaway: event.target.value,
                      };
                      return copy;
                    })
                  }
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2 text-xs text-white/50">
              <Button type="button" variant="secondary" onClick={saveNotes} loading={savingNotes}>
                Sauvegarder les notes
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/luna')}>
                Continuer sur Luna
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
