'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const focuses = [
  { key: 'behavioral', label: 'Comportemental' },
  { key: 'strategic', label: 'Stratégique' },
  { key: 'technical', label: 'Technique' },
] as const;

type Question = {
  question: string;
  competency: string;
  guidance: string;
};

export function RiseCoach() {
  const [role, setRole] = useState('');
  const [focus, setFocus] = useState<(typeof focuses)[number]['key']>('behavioral');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const response = await fetch('/api/rise/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, focus }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer l\'atelier');
      }

      const data = (await response.json()) as { questions: Question[] };
      setQuestions(data.questions);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Erreur interne');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Préparez votre session d&apos;entraînement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Rôle ciblé</label>
              <Input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Ex: Head of Product" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Focus</label>
              <div className="flex gap-2">
                {focuses.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFocus(item.key)}
                    className={`flex-1 rounded-2xl border px-3 py-2 text-xs transition ${
                      focus === item.key ? 'border-emerald-400/60 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-white/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end text-xs text-white/50">
            <Button onClick={fetchQuestions} disabled={!role} loading={loading}>
              Lancer l&apos;atelier
            </Button>
          </div>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Questions proposées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question) => (
              <div key={question.question} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{question.question}</h3>
                  <Badge>{question.competency}</Badge>
                </div>
                <p className="mt-2 text-xs text-white/60">{question.guidance}</p>
              </div>
            ))}
            <p className="text-xs text-white/50">
              Conseil : lancez Luna pendant votre entraînement pour obtenir un feedback en temps réel.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
