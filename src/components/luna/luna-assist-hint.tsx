'use client';

import { useCallback, useState } from 'react';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { logLunaInteraction } from '@/utils/luna-analytics';

type LunaAssistHintProps = {
  label?: string;
  helper?: string;
  getPrompt: () => string;
  focusArea?: string;
  source?: string;
};

export function LunaAssistHint({ label = 'Demander à Luna', helper, getPrompt, focusArea = 'coaching', source = 'unknown' }: LunaAssistHintProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    setLoading(true);
    setError(null);
    logLunaInteraction('hint_open', { source, focusArea });
    try {
      const prompt = getPrompt().trim();
      if (!prompt) {
        setResponse('Ajoutez quelques éléments et Luna proposera une reformulation.');
        return;
      }

      const res = await fetch('/api/luna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, focusArea }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Luna n’a pas pu répondre pour le moment.");
      }
      const data = (await res.json()) as { conversation?: { messages?: Array<{ role: string; content: string }> } };
      const messages = data.conversation?.messages ?? [];
      const lastAssistantMessage = [...messages].reverse().find((msg) => msg.role === 'assistant')?.content ?? null;
      setResponse(lastAssistantMessage ?? "Luna n’a pas pu formuler de réponse, réessayez plus tard.");
      logLunaInteraction('hint_response', { source, focusArea, hasPrompt: Boolean(prompt) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Luna n’est pas disponible";
      setError(message);
      logLunaInteraction('hint_error', { source, focusArea });
    } finally {
      setLoading(false);
    }
  }, [open, getPrompt, focusArea, source]);

  const handleOpenFullLuna = useCallback(() => {
    const prompt = getPrompt().trim();
    window.dispatchEvent(
      new CustomEvent('phoenix:luna-open', {
        detail: {
          prompt: prompt || "Luna, aide-moi à clarifier cette partie du formulaire Aube.",
          source,
        },
      }),
    );
    setOpen(false);
    logLunaInteraction('hint_open_full', { source, focusArea });
  }, [getPrompt, source, focusArea]);

  return (
    <div className="text-xs">
      <Button type="button" variant="ghost" className="gap-1 text-xs" onClick={handleToggle}>
        <Sparkles className="h-4 w-4" /> {label}
      </Button>
      {helper && <p className="mt-1 text-[11px] text-white/50">{helper}</p>}
      {open && (
        <div className="mt-2 space-y-3 rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-left text-xs text-emerald-100">
          {loading ? (
            <div className="flex items-center gap-2 text-emerald-100">
              <Loader2 className="h-4 w-4 animate-spin" /> Luna réfléchit…
            </div>
          ) : error ? (
            <p className="text-rose-200">{error}</p>
          ) : (
            <>
              <p className="leading-relaxed text-emerald-100/90">{response ?? 'Ajoutez un peu de contexte, puis relancez Luna.'}</p>
              <button
                type="button"
                onClick={handleOpenFullLuna}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-transparent px-3 py-1 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20',
                )}
              >
                Ouvrir Luna <ExternalLink className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
