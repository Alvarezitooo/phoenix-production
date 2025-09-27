import { AssessmentForm } from '@/components/assessment/assessment-form';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Target, Compass } from 'lucide-react';

export default function AubePage() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Aube — Career Discovery</h1>
          <p className="text-sm text-white/60">
            Une évaluation psychométrique orchestrée par Luna pour révéler vos affinités professionnelles et dessiner des trajectoires sur mesure.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <Compass className="h-5 w-5 text-emerald-300" />
          Big Five + RIASEC • Résultats instantanés
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div>
          <AssessmentForm />
        </div>
        <aside className="space-y-4">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="space-y-3 p-6 text-sm text-white/70">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <span className="font-semibold">Comment ça marche ?</span>
              </div>
              <ol className="space-y-3 text-xs text-white/60">
                <li>1. Indiquez vos traits de personnalité et préférences clés.</li>
                <li>2. Luna analyse vos réponses avec des modèles IA spécialisés.</li>
                <li>3. Recevez trois recommandations de carrière avec scoring détaillé.</li>
              </ol>
              <p className="text-xs text-white/50">
                Astuce : relancez un Complete Assessment après un coaching Luna pour mesurer votre progression.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20">
            <CardContent className="space-y-3 p-6 text-sm text-white">
              <div className="flex items-center gap-2 text-white">
                <Target className="h-4 w-4" />
                <span className="font-semibold">Points forts de Aube</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80">
                <li>• Compatibilité chiffrée avec les soft et hard skills requis.</li>
                <li>• Visualisation des écarts à combler pour chaque piste.</li>
                <li>• Intégration directe avec le CV Builder et Rise.</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
