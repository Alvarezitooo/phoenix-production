import { AuroraJourney } from '@/components/aurora/aurora-journey';
import { Card, CardContent } from '@/components/ui/card';
import { Sunrise, Sparkles, Target } from 'lucide-react';

export default function AuroraPage() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Aurora — Acculturation IA</h1>
          <p className="text-sm text-white/60">
            Un parcours empathique pour apprivoiser l&apos;intelligence artificielle, comprendre son fonctionnement, et apprendre à collaborer avec elle.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <Sunrise className="h-5 w-5 text-amber-300" />
          3 chambres • 20 minutes • Gratuit
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
          <AuroraJourney />
        </div>
        <aside className="space-y-4">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="space-y-3 p-6 text-sm text-white/70">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="font-semibold">Les 3 chambres</span>
              </div>
              <ol className="space-y-3 text-xs text-white/60">
                <li><strong>1. Le Voile</strong> — Identifier ce que tu ressens face à l&apos;IA</li>
                <li><strong>2. L&apos;Atelier</strong> — Comprendre comment une IA fonctionne</li>
                <li><strong>3. Le Dialogue</strong> — Apprendre à collaborer avec l&apos;IA</li>
              </ol>
              <p className="text-xs text-white/50">
                À la fin, tu recevras un bilan personnalisé et +11 points d&apos;énergie.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <CardContent className="space-y-3 p-6 text-sm text-white">
              <div className="flex items-center gap-2 text-white">
                <Target className="h-4 w-4" />
                <span className="font-semibold">Pourquoi Aurora ?</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80">
                <li>• Parcours empathique et sans jargon technique</li>
                <li>• Comprendre l&apos;IA pour mieux l&apos;utiliser (CV, lettres, Luna)</li>
                <li>• Aligné avec &quot;Région Sud - Terre d&apos;IA&quot;</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
