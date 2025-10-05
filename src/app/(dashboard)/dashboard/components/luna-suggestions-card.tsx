'use client';

import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { logLunaInteraction } from '@/utils/luna-analytics';

export type LunaSuggestion = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

type LunaSuggestionsCardProps = {
  suggestions: LunaSuggestion[];
};

export function LunaSuggestionsCard({ suggestions }: LunaSuggestionsCardProps) {
  const { showToast } = useToast();

  const handleClick = useCallback(
    (prompt: string) => {
      window.dispatchEvent(
        new CustomEvent('phoenix:luna-open', {
          detail: {
            prompt,
            source: 'dashboard_suggestion',
          },
        }),
      );
      showToast({
        title: 'Luna est prête',
        description: 'Retrouvez la conversation ouverte en bas à droite.',
        variant: 'info',
        duration: 4000,
      });
      logLunaInteraction('dashboard_suggestion_click', { prompt });
    },
    [showToast],
  );

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-emerald-400/30 bg-emerald-500/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-white">Luna vous suggère</CardTitle>
          <CardDescription>Deux actions rapides pour capitaliser sur vos derniers progrès.</CardDescription>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/30 text-emerald-50">
          <Sparkles className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-white/80">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="flex flex-col gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <div>
              <p className="font-semibold text-white">{suggestion.title}</p>
              <p className="text-xs text-emerald-100/80">{suggestion.description}</p>
            </div>
            <div>
              <Button type="button" variant="secondary" className="text-xs" onClick={() => handleClick(suggestion.prompt)}>
                Ouvrir avec Luna
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
