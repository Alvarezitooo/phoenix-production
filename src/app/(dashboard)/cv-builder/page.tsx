import { CvBuilder } from '@/components/cv/cv-builder';
import { Card, CardContent } from '@/components/ui/card';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { PenTool, Wand2 } from 'lucide-react';

export default function CvBuilderPage() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Créateur de CV</h1>
          <p className="text-sm text-white/60">
            Créez un CV percutant, calibré pour le rôle visé et optimisé pour les ATS.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <Wand2 className="h-5 w-5 text-emerald-300" />
          Templates personnalisés + mots-clés métiers
        </div>
      </section>

      <CvBuilder />

      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-emerald-300" />
            <span>Astuce: Importez vos expériences depuis LinkedIn pour accélérer la saisie.</span>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">Export PDF bientôt disponible</span>
        </CardContent>
      </Card>

      <FeedbackWidget module="CV_BUILDER" ctaLabel="Donner mon avis" />
    </div>
  );
}
