export function logLunaInteraction(event: string, metadata?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  void fetch('/api/analytics/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'MODULE_VIEWED',
      metadata: {
        module: 'LUNA',
        event,
        timestamp: new Date().toISOString(),
        ...(metadata ?? {}),
      },
    }),
  }).catch(() => {
    /* fire-and-forget */
  });
}
