import { LetterGenerator } from '@/components/letters/letter-generator';
import { Card, CardContent } from '@/components/ui/card';
import { Feather, Heart } from 'lucide-react';

export default function LettersPage() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Studio Lettres</h1>
          <p className="text-sm text-white/60">
            Co-créez des lettres motivées qui relient vos expériences à la culture de l&apos;entreprise ciblée.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <Feather className="h-5 w-5 text-emerald-300" />
          Ton, storytelling, metrics personnalisés
        </div>
      </section>

      <LetterGenerator />

      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-300" />
            <span>Incluez un lien direct vers votre CV Phoenix pour une candidature cohérente.</span>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">Export PDF bientôt disponible</span>
        </CardContent>
      </Card>
    </div>
  );
}
