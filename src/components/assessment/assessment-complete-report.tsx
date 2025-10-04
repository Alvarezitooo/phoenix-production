"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompatibilityBadge } from '@/components/ui/badge';
import { Recommendation } from '@/components/assessment/assessment-form';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitSummary(summary?: string | null) {
  if (!summary) return [];
  return summary
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

type AssessmentCompleteReportProps = {
  summary: string | null;
  recommendations: Recommendation[];
  assessmentId: string | null;
  isPro: boolean;
  selectedMatchId: string | null;
  selectingMatchId: string | null;
  selectionMessage: string | null;
  selectionError: string | null;
  onSelectMatch: (matchId: string) => Promise<void>;
};

export function AssessmentCompleteReport({
  summary,
  recommendations,
  assessmentId,
  isPro,
  selectedMatchId,
  selectingMatchId,
  selectionMessage,
  selectionError,
  onSelectMatch,
}: AssessmentCompleteReportProps) {
  const summaryParagraphs = splitSummary(summary);
  const allSkills = uniqueValues(recommendations.flatMap((rec) => rec.requiredSkills ?? []));
  const allFocus = uniqueValues(recommendations.flatMap((rec) => rec.developmentFocus ?? []));
  const [exportLoading, setExportLoading] = useState<'pdf' | 'markdown' | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const quickActions = [
    {
      title: 'Transformer en CV ciblé',
      description: 'Importez la trajectoire sélectionnée dans le Créateur de CV pour générer un brouillon personnalisé.',
      href: '/cv-builder',
    },
    {
      title: 'Préparer un atelier Rise',
      description: 'Générez un plan d’entretien adapté au métier choisi avec coaching Luna intégré.',
      href: '/rise',
    },
    {
      title: 'Débriefer avec Luna',
      description: 'Partagez vos résultats Aube à Luna pour prioriser vos prochains leviers de progression.',
      href: '/luna',
    },
  ];

  async function handleExport(format: 'pdf' | 'markdown') {
    if (!assessmentId) {
      setExportError('Rapport indisponible. Relancez une analyse complète.');
      return;
    }
    setExportLoading(format);
    setExportError(null);
    setExportMessage(null);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/export/${format}`);
      if (!response.ok) {
        let message = 'Impossible d’exporter le rapport.';
        try {
          const data = await response.json();
          if (data?.message) message = data.message;
        } catch {
          // ignore parse
        }
        throw new Error(message);
      }

      if (format === 'markdown') {
        const markdown = await response.text();
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rapport-aube.md';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setExportMessage('Rapport exporté en Markdown.');
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rapport-aube.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setExportMessage('Rapport exporté en PDF.');
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Erreur inattendue lors de l’export.');
    } finally {
      setExportLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {selectionMessage && (
        <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          {selectionMessage}
        </div>
      )}
      {selectionError && (
        <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {selectionError}
        </div>
      )}

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Lecture synthétique</CardTitle>
          <CardDescription>Ce que révèle votre profil et les dynamiques à activer en priorité.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/70">
          {summaryParagraphs.length > 0 ? (
            summaryParagraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="leading-relaxed text-white/50">
              La synthèse détaillée sera disponible après la prochaine analyse complète.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Trajectoires Aube</CardTitle>
          <CardDescription>Trois pistes d’évolution avec vos leviers de succès et actions d’upskilling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {recommendations.map((item) => {
            const matchId = item.id ?? null;
            const isSelectable = Boolean(matchId);
            const isSelected = isSelectable && selectedMatchId === matchId;
            const isLoading = isSelectable && selectingMatchId === matchId;
            const handleSelectMatch = () => {
              if (!matchId) return;
              void onSelectMatch(matchId);
            };
            return (
            <article key={item.careerTitle} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{item.careerTitle}</h3>
                  {item.sector && <p className="text-sm text-white/60">Secteur&nbsp;: {item.sector}</p>}
                </div>
                <CompatibilityBadge value={Math.round(item.compatibilityScore)} />
              </div>
              {item.description && <p className="mt-3 text-sm text-white/70">{item.description}</p>}
              {item.requiredSkills?.length ? (
                <div className="mt-4 text-xs text-white/60">
                  <span className="uppercase tracking-wide text-white/60">Compétences clés</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.requiredSkills.map((skill) => (
                      <span key={skill} className="rounded-full bg-white/10 px-3 py-1">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.developmentFocus?.length ? (
                <div className="mt-4 text-xs text-white/60">
                  <span className="uppercase tracking-wide text-white/60">Chantiers de progression</span>
                  <ul className="mt-2 space-y-1">
                    {item.developmentFocus.map((focus) => (
                      <li key={focus}>• {focus}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.salaryRange && (
                <div className="mt-4 text-sm text-white/70">Rémunération indicative&nbsp;: {item.salaryRange}</div>
              )}
              {isSelectable && (
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    disabled={isLoading}
                    loading={isLoading}
                    className="text-xs"
                    onClick={handleSelectMatch}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Trajectoire principale
                      </span>
                    ) : (
                      'Définir comme trajectoire principale'
                    )}
                  </Button>
                </div>
              )}
            </article>
          );
          })}
        </CardContent>
      </Card>

      {isPro ? (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Exporter le rapport</CardTitle>
            <CardDescription>Partagez vos résultats Aube avec vos parties prenantes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={exportLoading !== null}
                loading={exportLoading === 'pdf'}
                onClick={() => handleExport('pdf')}
              >
                Export PDF
              </Button>
              <Button
                variant="ghost"
                disabled={exportLoading !== null}
                loading={exportLoading === 'markdown'}
                onClick={() => handleExport('markdown')}
              >
                Export Markdown / Notion
              </Button>
            </div>
            {exportMessage && <p className="text-xs text-emerald-200">{exportMessage}</p>}
            {exportError && <p className="text-xs text-rose-300">{exportError}</p>}
            {!assessmentId && (
              <p className="text-xs text-white/50">Relancez une analyse complète pour générer un rapport exportable.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Exporter le rapport</CardTitle>
            <CardDescription>Réservé au plan Pro avec rapport complet illimité.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-white/60">
            Passez au plan Pro pour télécharger le rapport Aube au format PDF/Markdown et l’intégrer directement dans vos outils (Notion, ATS).
            <div className="mt-4">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Découvrir le plan Pro
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Forces consolidées</CardTitle>
          <CardDescription>Utilisez ces éléments différenciants dans vos CV, lettres et entretiens.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <h4 className="text-sm font-semibold text-white">Compétences récurrentes</h4>
            {allSkills.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {allSkills.map((skill) => (
                  <li key={skill}>• {skill}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/50">Complétez Aube ou votre CV pour enrichir cette liste.</p>
            )}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <h4 className="text-sm font-semibold text-white">Axes de progression</h4>
            {allFocus.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {allFocus.map((focus) => (
                  <li key={focus}>• {focus}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/50">Renseignez vos axes de progression pour générer un plan d’action personnalisé.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Passer à l’action</CardTitle>
          <CardDescription>Activez les modules Phoenix complémentaires pour capitaliser sur ces résultats.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/60 hover:bg-white/10"
            >
              <div>
                <h3 className="text-sm font-semibold text-white">{action.title}</h3>
                <p className="mt-2 text-xs text-white/60">{action.description}</p>
              </div>
              <span className="mt-4 text-xs font-semibold text-emerald-200">Ouvrir</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <FeedbackWidget module="AUBE_COMPLETE" ctaLabel="Partager un retour" />
    </div>
  );
}
