'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { EnergyPack } from '@/config/energy';

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

function formatEnergyAmount(amount: number | 'unlimited') {
  if (amount === 'unlimited') {
    return 'Énergie illimitée (fair-use intelligent)';
  }
  return `${amount} points d’énergie`;
}

export function PlanCard({ pack }: { pack: EnergyPack }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const priceLabel = useMemo(() => currencyFormatter.format(pack.priceEuros), [pack.priceEuros]);

  function logPackClick() {
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ENERGY_PACK_CLICK',
        metadata: {
          packId: pack.id,
          price: pack.priceEuros,
        },
      }),
    }).catch(() => {
      /* ignore */
    });
  }

  async function handleCheckout() {
    logPackClick();
    setLoading(true);

    try {
      const response = await fetch('/api/energy/packs/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: pack.id }),
      });

      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (response.status === 401) {
        const callback = encodeURIComponent(`/energy?pack=${pack.id}`);
        window.location.href = `/auth/sign-in?callbackUrl=${callback}`;
        return;
      }

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.message ?? 'Impossible de créer la session de paiement.');
      }

      window.location.href = payload.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Paiement momentanément indisponible.';
      showToast({ title: 'Checkout indisponible', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg transition hover:border-emerald-400/60 hover:shadow-emerald-500/10 ${
        pack.highlight ? 'ring-2 ring-emerald-400/60' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.12),_transparent_60%)] opacity-0 transition group-hover:opacity-100" />
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-200">{pack.name}</p>
          <h3 className="text-3xl font-semibold text-white">{priceLabel}</h3>
          <p className="text-sm text-white/60">{pack.description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {formatEnergyAmount(pack.energyAmount)}
        </div>
      </div>
      <Button className="mt-6 w-full" onClick={() => void handleCheckout()} loading={loading}>
        Choisir ce pack
      </Button>
    </div>
  );
}
