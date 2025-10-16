import { Metadata } from 'next';
import { PlanCard } from '@/components/pricing/plan-card';
import { PricingAnalyticsTracker } from '@/components/analytics/pricing-tracker';
import { ENERGY_PACKS } from '@/config/energy';

export const metadata: Metadata = {
  title: 'Packs énergie | Phoenix',
  description: "Choisissez le pack d’énergie Luna qui correspond à votre cadence de préparation.",
};

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <PricingAnalyticsTracker />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Packs énergie</p>
          <h1 className="text-3xl font-semibold text-white">Rechargez Luna selon votre cadence</h1>
          <p className="max-w-2xl text-sm text-white/60">
            Choisissez un pack ponctuel ou l’accès buffet pour générer CV, lettres, ateliers Rise et conversations avec Luna. Aucun engagement,
            vous ne payez que pour l’énergie utilisée.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {ENERGY_PACKS.map((pack) => (
            <PlanCard key={pack.id} pack={pack} />
          ))}
        </div>
      </section>
    </div>
  );
}
