'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';

export type AuroraReportData = {
  emotionalProfile: string;
  badge: string;
  summary: string;
  learnings: Array<{ chamber: string; lesson: string }>;
  nextSteps: string[];
  energyEarned: number;
  badgesUnlocked: number;
};

type Props = {
  sessionId: string;
  initialReport?: AuroraReportData | null;
};

export function AuroraReport({ sessionId, initialReport = null }: Props) {
  const [loading, setLoading] = useState(!initialReport);
  const [report, setReport] = useState<AuroraReportData | null>(initialReport);

  useEffect(() => {
    if (initialReport) return;
    let isCancelled = false;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/aurora/report?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error('Unable to load Aurora report');
        }
        const data = await res.json();
        if (!isCancelled) {
          setReport(data.report);
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
        if (!isCancelled) {
          setReport(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchReport();

    return () => {
      isCancelled = true;
    };
  }, [sessionId, initialReport]);

  if (loading) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-12 text-center text-white/60">
          <p>Impossible de charger ton bilan. Réessaie dans quelques instants.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-orange-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white">
              Ton parcours Aurora est terminé 🌅
            </CardTitle>
            <span className="text-4xl">{report.badge}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-white/70">Ton profil émotionnel face à l'IA :</p>
            <p className="text-xl font-semibold text-white">{report.emotionalProfile}</p>
          </div>
          <p className="text-sm text-white/80">{report.summary}</p>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>+{report.energyEarned} points d'énergie • {report.badgesUnlocked} badges</span>
          </div>
        </CardContent>
      </Card>

      {/* Learnings */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Ce que tu as appris</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.learnings.map((learning, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">{learning.chamber}</p>
                <p className="text-xs text-white/70">{learning.lesson}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Tes prochains pas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.nextSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="mt-0.5 text-amber-400">→</span>
              <p className="text-sm text-white/80">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-6 text-center">
          <p className="text-xs text-white/50">
            Parcours réalisé avec Aurora, propulsé par Gemini/Mistral
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-amber-500 hover:bg-amber-600"
          >
            Retour au dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
