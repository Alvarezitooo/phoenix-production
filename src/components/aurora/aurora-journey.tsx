'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AuroraVoile } from './aurora-voile';
import { AuroraAtelier } from './aurora-atelier';
import { AuroraDialogue } from './aurora-dialogue';
import { AuroraReport, type AuroraReportData } from './aurora-report';

type AuroraSession = {
  id: string;
  currentChamber: number;
  dialogue: Array<{ role: string; content: string; timestamp: string }>;
  insights: any;
  emotionalProfile: string | null;
  completedAt: string | null;
};

const CHAMBERS = [
  { id: 0, name: 'Le Voile', component: AuroraVoile },
  { id: 1, name: 'L\'Atelier', component: AuroraAtelier },
  { id: 2, name: 'Le Dialogue', component: AuroraDialogue },
];

export function AuroraJourney() {
  const [session, setSession] = useState<AuroraSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<AuroraReportData | null>(null);

  // Charge ou crée la session au montage
  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      // Récupère la session existante
      const res = await fetch('/api/aurora/session');
      const data = await res.json();

      if (data.session) {
        setSession(data.session);
        if (data.session.completedAt) {
          setShowReport(true);
          await fetchReport(data.session.id);
        } else {
          setShowReport(false);
          setReport(null);
        }
      } else {
        // Crée une nouvelle session
        const createRes = await fetch('/api/aurora/session', { method: 'POST' });
        const createData = await createRes.json();
        setSession(createData.session);
      }
    } catch (error) {
      console.error('Failed to init Aurora session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChamberComplete = async () => {
    if (!session) return;

    const nextChamber = session.currentChamber + 1;

    // Si on a terminé toutes les chambres (0, 1, 2), on complète la session
    if (nextChamber > 2) {
      await completeJourney();
    } else {
      // Sinon on avance à la chambre suivante
      await advanceChamber(nextChamber);
    }
  };

  const advanceChamber = async (toChamber: number) => {
    if (!session) return;

    try {
      const res = await fetch('/api/aurora/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          toChamber,
        }),
      });

      if (res.ok) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                currentChamber: toChamber,
              }
            : prev,
        );
      }
    } catch (error) {
      console.error('Failed to advance chamber:', error);
    }
  };

  const completeJourney = async () => {
    if (!session) return;

    try {
      const res = await fetch('/api/aurora/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!res.ok) {
        throw new Error('Unable to complete Aurora journey');
      }

      const data = await res.json();
      setReport(data.report ?? null);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              completedAt: new Date().toISOString(),
            }
          : prev,
      );
      setShowReport(true);
    } catch (error) {
      console.error('Failed to complete journey:', error);
    }
  };

  const fetchReport = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/aurora/report?sessionId=${sessionId}`);
      if (!res.ok) {
        throw new Error('Unable to load Aurora report');
      }
      const data = await res.json();
      setReport(data.report ?? null);
    } catch (error) {
      console.error('Failed to fetch Aurora report:', error);
      setReport(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-12 text-center text-white/60">
          <p>Impossible de charger Aurora. Réessaie dans quelques instants.</p>
        </CardContent>
      </Card>
    );
  }

  // Si la session est terminée, affiche le rapport
  if (showReport) {
    return <AuroraReport sessionId={session.id} initialReport={report} />;
  }

  // Affiche la chambre courante
  const currentChamberData = CHAMBERS[session.currentChamber];
  const CurrentChamberComponent = currentChamberData.component;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-white/60">
            Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {CHAMBERS.map((chamber) => (
              <div
                key={chamber.id}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  chamber.id < session.currentChamber
                    ? 'bg-amber-400'
                    : chamber.id === session.currentChamber
                    ? 'bg-amber-400/50'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/50">
            {currentChamberData.name} ({session.currentChamber + 1}/3)
          </p>
        </CardContent>
      </Card>

      {/* Chambre courante */}
      <CurrentChamberComponent
        sessionId={session.id}
        onComplete={handleChamberComplete}
      />
    </div>
  );
}
