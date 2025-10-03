'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Impossible d’accéder au portail de facturation');
      }

      const payload = (await response.json()) as { url?: string };
      if (!payload.url) {
        throw new Error('Lien de facturation indisponible. Réessayez dans quelques minutes.');
      }

      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <Button type="button" onClick={openPortal} loading={loading} variant="secondary">
        Gérer mon abonnement
      </Button>
      {error && <p className="text-xs text-rose-200">{error}</p>}
    </div>
  );
}
