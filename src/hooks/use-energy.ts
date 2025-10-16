'use client';

import { useQuery } from '@tanstack/react-query';

export type EnergySnapshot = {
  balance: number;
  streakDays: number;
  lastActionAt: string | null;
  lastBonusAt: string | null;
  bonus: {
    threshold: number;
    amount: number;
    progressDays: number;
    daysUntilBonus: number;
  };
};

async function fetchEnergySnapshot(): Promise<EnergySnapshot> {
  const response = await fetch('/api/energy', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Impossible de récupérer votre énergie');
  }

  return (await response.json()) as EnergySnapshot;
}

export function useEnergySnapshot(enabled: boolean) {
  return useQuery({
    queryKey: ['energy-snapshot'],
    queryFn: fetchEnergySnapshot,
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}
