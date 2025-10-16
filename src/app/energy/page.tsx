import { Metadata } from 'next';
import { PlanCard } from '@/components/pricing/plan-card';
import { ENERGY_COSTS, ENERGY_PACKS, STREAK_BONUS_AMOUNT, STREAK_LENGTH_FOR_BONUS, getEnergyPackById } from '@/config/energy';

export const metadata: Metadata = {
  title: 'Boutique énergie Luna | Phoenix',
  description: 'Rechargez votre énergie Luna pour générer CV, lettres, ateliers Rise et conversations IA.',
};

const ACTION_SUMMARY = [
  { key: 'cv.generate', label: 'Génération CV complète' },
  { key: 'letters.generate', label: 'Lettre motivation' },
  { key: 'rise.generate', label: 'Atelier Rise' },
  { key: 'assessment.complete', label: 'Analyse Aube complète' },
  { key: 'export.pdf', label: 'Export PDF (CV ou Aube)' },
  { key: 'luna.chat', label: 'Message Luna' },
] as const;

type EnergyPageProps = {
  searchParams?: Promise<{
    success?: string;
    cancel?: string;
    pack?: string;
  }>;
};

export default async function EnergyPage({ searchParams }: EnergyPageProps) {
  const params = searchParams ? await searchParams : {};
  const packParam = params?.pack;
  const selectedPack = packParam ? getEnergyPackById(packParam) : undefined;
  const shouldShowSuccess = params?.success === '1';
  const shouldShowCancel = params?.cancel === '1';

  return (
    <div className="space-y-12">
      {(shouldShowSuccess || shouldShowCancel) && (
        <section
          className={`rounded-3xl border p-6 text-sm ${
            shouldShowSuccess
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : 'border-white/10 bg-white/5 text-white/70'
          }`}
        >
          {shouldShowSuccess ? (
            <p>
              Merci&nbsp;! {selectedPack ? `Le pack ${selectedPack.name} est en cours d’activation.` : 'achat confirmé.'}{' '}
              Tu recevras un reçu par email sous peu.
            </p>
          ) : (
            <p>Le checkout a été interrompu. Tu peux relancer la commande à tout moment.</p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Fonctionnement</p>
          <h1 className="text-3xl font-semibold text-white">Votre énergie Luna, à la demande</h1>
          <p className="max-w-3xl text-sm text-white/60">
            Chaque action clé consomme un petit nombre de points d’énergie. Rechargez quand vous le souhaitez ou optez pour le buffet à volonté.
            Un bonus automatique de +{STREAK_BONUS_AMOUNT} points est ajouté tous les {STREAK_LENGTH_FOR_BONUS} jours consécutifs d’utilisation.
          </p>
        </div>
        <div className="mt-6 grid gap-3 text-sm text-white/70 md:grid-cols-2 lg:grid-cols-3">
          {ACTION_SUMMARY.map((action) => (
            <div key={action.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">{action.label}</p>
              <p className="text-xs text-white/50">
                Coût&nbsp;: {ENERGY_COSTS[action.key]} point{ENERGY_COSTS[action.key] > 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Choisir un pack</p>
          <h2 className="text-2xl font-semibold text-white">Rechargez selon vos besoins</h2>
          <p className="max-w-2xl text-sm text-white/60">
            Les packs ci-dessous sont ponctuels. Vous ne perdez jamais vos points, et vous pouvez combiner plusieurs recharges si nécessaire.
            Le buffet à volonté est renouvelé automatiquement chaque mois et inclut un fair-use intelligent pour maintenir une expérience fluide.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {ENERGY_PACKS.map((pack) => (
            <PlanCard key={pack.id} pack={pack} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-semibold text-white">Questions fréquentes</h2>
        <div className="mt-4 space-y-4 text-sm text-white/70">
          <div>
            <h3 className="text-sm font-semibold text-white">Que se passe-t-il si je n’ai plus d’énergie&nbsp;?</h3>
            <p className="mt-1">
              Les actions gourmandes (génération CV, lettres, ateliers Rise) sont bloquées jusqu’à la prochaine recharge. Les brouillons et exports déjà
              générés restent accessibles.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Comment fonctionne le buffet à volonté&nbsp;?</h3>
            <p className="mt-1">
              Le buffet offre une énergie illimitée avec un fair-use de bon sens (≈ 600 points/mois). Au-delà, Luna ralentit légèrement et nous vous
              contactons pour dimensionner un pack adapté.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Puis-je offrir de l’énergie à un membre de mon équipe&nbsp;?</h3>
            <p className="mt-1">
              Oui, contactez support@phoenix.lu pour obtenir des coupons de recharge ou un bouquet d’énergie pour vos collaborateurs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
