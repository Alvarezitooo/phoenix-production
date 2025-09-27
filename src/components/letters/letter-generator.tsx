'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BadgeCheck } from 'lucide-react';

const formSchema = z.object({
  jobTitle: z.string().min(2),
  company: z.string().min(2),
  tone: z.enum(['professional', 'friendly', 'impactful']).default('professional'),
  highlights: z.array(z.string().min(5)).min(2),
  resumeSummary: z.string().min(30),
});

type FormValues = z.infer<typeof formSchema>;

const tones = [
  { key: 'professional', label: 'Professionnel' },
  { key: 'friendly', label: 'Chaleureux' },
  { key: 'impactful', label: 'Impactant' },
] as const;

export function LetterGenerator() {
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: '',
      company: '',
      tone: 'professional',
      highlights: ['', ''],
      resumeSummary: '',
    },
  });

  const highlightsArray = useFieldArray({ control: form.control, name: 'highlights' });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: values.jobTitle,
          company: values.company,
          tone: values.tone,
          highlights: values.highlights.filter(Boolean),
          resumeSummary: values.resumeSummary,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Impossible de générer la lettre');
      }

      const data = (await response.json()) as { content: string };
      setLetter(data.content);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Erreur interne');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Paramètres de la lettre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Poste ciblé</label>
              <Input placeholder="Ex: Product Marketing Manager" {...form.register('jobTitle')} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Entreprise</label>
              <Input placeholder="Nom de l'entreprise" {...form.register('company')} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Résumé de CV</label>
              <Textarea rows={4} placeholder="Résumez vos forces et vos succès clés." {...form.register('resumeSummary')} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Ton souhaité</label>
              <div className="grid grid-cols-3 gap-2">
                {tones.map((tone) => (
                  <button
                    key={tone.key}
                    type="button"
                    onClick={() => form.setValue('tone', tone.key)}
                    className={`rounded-2xl border px-3 py-3 text-xs transition ${
                      form.watch('tone') === tone.key ? 'border-emerald-400/60 bg-emerald-500/15 text-white' : 'border-white/10 bg-white/5 text-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{tone.label}</span>
                      {form.watch('tone') === tone.key && <BadgeCheck className="h-4 w-4 text-emerald-300" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40">Highlights</label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => highlightsArray.append('')}
                >
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {highlightsArray.fields.map((field, index) => (
                  <Input
                    key={field.id}
                    placeholder="Ex: Pilotage d'un lancement produit européen"
                    {...form.register(`highlights.${index}` as const)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end text-xs text-white/50">
              <Button type="submit" loading={loading}>
                Générer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-slate-950/50">
        <CardHeader>
          <CardTitle>Lettre générée</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px] overflow-auto rounded-3xl bg-black/40 p-6 text-sm text-white/80">
          {letter ? (
            <article className="prose prose-invert max-w-none whitespace-pre-wrap text-white/80">{letter}</article>
          ) : (
            <p className="text-white/50">Remplissez les informations pour recevoir une lettre personnalisée en moins de 30 secondes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
