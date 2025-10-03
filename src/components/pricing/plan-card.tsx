'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import type { SubscriptionPlan } from '@prisma/client';

const redirectOrCheckout = async (
  plan: SubscriptionPlan,
  router: ReturnType<typeof useRouter>,
  isAuthenticated: boolean,
  setLoading: (value: boolean) => void,
) => {
  const logClick = () => {
    if (!isAuthenticated) return;
    const source = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PLAN_UPGRADE_CLICK',
        metadata: {
          plan,
          source,
        },
      }),
    }).catch(() => {
      // ignore logging error
    });
  };

  if (plan === 'DISCOVERY') {
    logClick();
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/auth/register');
    }
    return;
  }

  if (!isAuthenticated) {
    router.push(`/auth/register?plan=${plan}`);
    return;
  }

  setLoading(true);
  try {
    logClick();
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message ?? 'Impossible de lancer la souscription');
    }

    const { url } = (await response.json()) as { url: string };
    window.location.href = url;
  } catch (error) {
    console.error('[CHECKOUT]', error);
    alert(error instanceof Error ? error.message : 'Erreur inattendue');
  } finally {
    setLoading(false);
  }
};

export function PlanCard(props: {
  plan: SubscriptionPlan;
  title: string;
  price: string;
  description: string;
  perks: string[];
  highlight?: boolean;
  ctaLabel?: string;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(false);

  return (
    <div
      className={`flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-emerald-400/60 hover:shadow-emerald-500/10 ${
        props.highlight ? 'ring-2 ring-emerald-400/60' : ''
      }`}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-emerald-200">{props.title}</p>
          <h3 className="text-3xl font-semibold text-white">{props.price}</h3>
          <p className="text-sm text-white/60">{props.description}</p>
        </div>
        <ul className="space-y-2 text-sm text-white/70">
          {props.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>
      <Button
        className="mt-6 w-full"
        loading={loading && props.plan !== 'DISCOVERY'}
        onClick={() => redirectOrCheckout(props.plan, router, status === 'authenticated', setLoading)}
      >
        {props.ctaLabel ?? 'Choisir ce plan'}
      </Button>
    </div>
  );
}
