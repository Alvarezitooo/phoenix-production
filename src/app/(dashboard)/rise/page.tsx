import { RiseCoach } from '@/components/rise/rise-coach';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MessageSquare } from 'lucide-react';

export default function RisePage() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Rise — Interview Studio</h1>
          <p className="text-sm text-white/60">
            Entraînez-vous sur des questions ciblées et obtenez un feedback dynamique avec Luna.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <Mic className="h-5 w-5 text-emerald-300" />
          Simulation de questions + coach en temps réel
        </div>
      </section>

      <RiseCoach />

      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-300" />
            <span>Ouvrez Luna (bouton en bas à droite) pour simuler les réponses et recevoir des relances personnalisées.</span>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">Coaching vocal en bêta privée</span>
        </CardContent>
      </Card>
    </div>
  );
}
