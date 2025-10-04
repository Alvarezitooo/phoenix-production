'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function BetaCouponForm() {
  const router = useRouter();
  const { update } = useSession();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError('Merci de saisir un code.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/beta/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? 'Impossible de valider ce code.');
        return;
      }

      const endDate = data?.periodEnd ? new Date(data.periodEnd) : null;
      const formattedDate = endDate
        ? endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
      setMessage(
        formattedDate
          ? `Bienvenue dans la bêta ! Votre accès ${data?.plan ?? ''} est actif jusqu’au ${formattedDate}.`
          : 'Bienvenue dans la bêta ! Votre accès est désormais actif.',
      );
      setCode('');

      await update?.();
      router.refresh();
    } catch (err) {
      console.error('[BETA_COUPON_FORM]', err);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="beta-code" className="text-xs uppercase tracking-wide text-white/60">
          Code d’accès bêta
        </label>
        <Input
          id="beta-code"
          placeholder="PHOENIX-BETA-2024"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" loading={loading}>
          Activer mon accès bêta
        </Button>
      </div>
      {error && <p className="text-xs text-rose-200">{error}</p>}
      {message && <p className="text-xs text-emerald-200">{message}</p>}
    </form>
  );
}
