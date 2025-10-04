'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const FEEDBACK_TYPES = [
  { value: 'BUG', label: 'Bug' },
  { value: 'IDEA', label: 'Suggestion' },
  { value: 'QUESTION', label: 'Question' },
];

type FeedbackWidgetProps = {
  module: string;
  context?: Record<string, unknown>;
  ctaLabel?: string;
  compact?: boolean;
};

export function FeedbackWidget({ module, context, ctaLabel = 'Signaler un bug / suggestion', compact }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('BUG');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    setError(null);
    setSuccess(null);
  };

  async function submitFeedback() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, category, message, context }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message ?? 'Impossible d’envoyer votre retour.');
        return;
      }
      setSuccess('Merci ! Votre retour a bien été transmis.');
      setMessage('');
    } catch (err) {
      console.error('[FEEDBACK_WIDGET]', err);
      setError('Erreur inattendue. Réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? 'rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70' : 'space-y-3 text-sm text-white/70'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-white/50">Retour bêta</span>
        <Button type="button" variant={open ? 'secondary' : 'ghost'} onClick={toggleOpen} className="text-xs">
          {open ? 'Fermer' : ctaLabel}
        </Button>
      </div>
      {open && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setCategory(type.value)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  category === type.value
                    ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40'
                    : 'border border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Expliquez-nous ce qui fonctionne, ce qui bloque ou l’idée à creuser."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <span>{message.length}/2000</span>
            <Button type="button" variant="primary" loading={loading} disabled={message.trim().length < 10} onClick={submitFeedback}>
              Envoyer mon retour
            </Button>
          </div>
          {error && <p className="text-xs text-rose-200">{error}</p>}
          {success && <p className="text-xs text-emerald-200">{success}</p>}
        </div>
      )}
    </div>
  );
}
