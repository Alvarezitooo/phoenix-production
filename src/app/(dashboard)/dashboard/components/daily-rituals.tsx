'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { DAILY_RITUALS } from '@/config/rituals';

const queryKey = ['daily-rituals'];

type RitualWithStatus = (typeof DAILY_RITUALS)[number] & { completed: boolean };

type RitualResponse = {
  rituals: RitualWithStatus[];
};

export function DailyRituals() {
  const { showToast } = useToast();
  const client = useQueryClient();

  const { data, isLoading } = useQuery<RitualResponse>({
    queryKey,
    queryFn: async () => {
      const response = await fetch('/api/rituals');
      if (!response.ok) {
        throw new Error('Rituels indisponibles');
      }
      return (await response.json()) as RitualResponse;
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (ritualId: string) => {
      const response = await fetch('/api/rituals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ritualId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? 'Impossible de valider ce rituel.');
      }
      return (await response.json()) as { ok: boolean; reward?: number };
    },
    onSuccess: (payload) => {
      void fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'RITUAL_COMPLETED',
          metadata: { ritualId: mutation.variables },
        }),
      }).catch(() => {
        /* ignore fire-and-forget */
      });
      void client.invalidateQueries({ queryKey });
      if (payload.reward && payload.reward > 0) {
        showToast({
          title: 'Énergie gagnée',
          description: `+${payload.reward} point${payload.reward > 1 ? 's' : ''} d’énergie.`,
          variant: 'success',
        });
      }
    },
    onError: (error) => {
      showToast({
        title: 'Rituel',
        description: error instanceof Error ? error.message : 'Réessaie dans quelques instants.',
        variant: 'error',
      });
    },
  });

  const rituals = data?.rituals ?? DAILY_RITUALS.map((ritual) => ({ ...ritual, completed: false }));
  const completedCount = rituals.filter((ritual) => ritual.completed).length;
  const totalCount = rituals.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remaining = Math.max(totalCount - completedCount, 0);

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Rituels journaliers</p>
          <h3 className="text-lg font-semibold text-white">Active ton énergie en 5 minutes</h3>
        </div>
        <div className="text-right text-xs text-white/60">
          {completedCount}/{totalCount} rituels complétés
          <ProgressBar value={completionPercent} className="mt-1 w-32" />
          {remaining > 0 ? (
            <p className="mt-1 text-[11px] text-emerald-200/80">Plus que {remaining} rituel{remaining > 1 ? 's' : ''} pour nourrir ton énergie.</p>
          ) : (
            <p className="mt-1 text-[11px] text-emerald-200/80">Rituels accomplis, Luna te félicite ✦</p>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rituals.map((ritual) => (
          <div
            key={ritual.id}
            className={`flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 transition ${
              ritual.completed ? 'opacity-50' : 'hover:border-emerald-400/60 hover:bg-white/10'
            }`}
          >
            <div>
              <h4 className="text-sm font-semibold text-white">{ritual.title}</h4>
              <p className="mt-1 text-xs text-white/50">{ritual.description}</p>
            </div>
            <Button
              type="button"
              variant={ritual.completed ? 'ghost' : 'secondary'}
              disabled={ritual.completed || mutation.isPending}
              onClick={() => mutation.mutate(ritual.id)}
              className="mt-4 text-xs"
            >
              {ritual.completed ? 'Rituel accompli' : `Valider (+${ritual.energyReward} pt)`}
            </Button>
          </div>
        ))}
      </div>
      {isLoading && <p className="mt-3 text-xs text-white/40">Chargement des rituels…</p>}
    </div>
  );
}
