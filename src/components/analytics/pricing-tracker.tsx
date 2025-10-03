'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function PricingAnalyticsTracker() {
  const { status } = useSession();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    if (status !== 'authenticated') return;

    sentRef.current = true;
    const source = typeof window !== 'undefined' ? window.location.pathname : 'pricing';
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PLAN_UPGRADE_VIEW', metadata: { source } }),
    }).catch(() => {
      sentRef.current = false;
    });
  }, [status]);

  return null;
}
