'use client';

import { EnergyMeter } from '@/components/ui/energy-meter';
import { ProgressBar } from '@/components/ui/progress';

type DashboardEnergyProps = {
  balance: number;
  streakDays: number;
  bonusAmount: number;
  bonusThreshold: number;
  bonusProgressDays: number;
  daysUntilBonus: number;
  element?: string | null;
};

export function DashboardEnergy({
  balance,
  element,
  streakDays,
  bonusAmount,
  bonusThreshold,
  bonusProgressDays,
  daysUntilBonus,
}: DashboardEnergyProps) {
  const pct = Math.min(Math.round((balance / 200) * 100), 100);
  const streakPercent = bonusThreshold > 0 ? Math.min(Math.round((bonusProgressDays / bonusThreshold) * 100), 100) : 0;
  const displayDaysUntil = daysUntilBonus === 0 && streakDays > 0 ? bonusThreshold : daysUntilBonus;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-8 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 space-y-3 text-center md:text-left">
        <p className="text-xs uppercase tracking-wide text-white/60">Énergie Luna</p>
        <h2 className="text-2xl font-semibold text-white">{balance} points disponibles</h2>
        <p className="text-sm text-white/60">Streak en cours : {streakDays} jour{streakDays > 1 ? 's' : ''}</p>
        <div>
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Progression vers le bonus +{bonusAmount}</span>
            <span>
              {bonusProgressDays}/{bonusThreshold} jour{bonusThreshold > 1 ? 's' : ''}
            </span>
          </div>
          <ProgressBar value={streakPercent} className="mt-1" />
          <p className="mt-1 text-xs text-white/40">
            {displayDaysUntil === 0
              ? 'Bonus débloqué aujourd’hui'
              : `Encore ${displayDaysUntil} jour${displayDaysUntil > 1 ? 's' : ''} d’engagement pour le prochain bonus.`}
          </p>
        </div>
      </div>
      <EnergyMeter value={pct} label="Énergie" element={(element as 'FEU' | 'EAU' | 'AIR' | 'TERRE' | 'ETHER') ?? 'AIR'} size="md" />
    </div>
  );
}
