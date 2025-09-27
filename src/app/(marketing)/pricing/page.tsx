import { Metadata } from 'next';
import { PlanCard } from '@/components/pricing/plan-card';

export const metadata: Metadata = {
  title: 'Plans & Tarifs | Phoenix',
  description: "Choisissez l’abonnement Phoenix qui correspond à vos objectifs de carrière.",
};

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Plans mensuels</p>
          <h1 className="text-3xl font-semibold text-white">Investissez dans votre prochaine étape professionnelle</h1>
          <p className="max-w-2xl text-sm text-white/60">
            Phoenix propose deux formules simples, sans système de crédits. Chaque abonnement inclut les évaluations, les
            générateurs de contenus et l’assistant Luna. Changez de plan ou annulez à tout moment.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <PlanCard
            plan="ESSENTIAL"
            title="Essentiel"
            price="17,99 €/mois"
            description="Pour clarifier son prochain rôle et optimiser ses candidatures."
            perks={[
              'Aube Quick illimité',
              'CV Builder et Letters en accès complet',
              '10 sessions Rise & Luna par mois',
              'Exports clés (docx, Markdown)',
            ]}
          />
          <PlanCard
            plan="PRO"
            title="Pro"
            price="29,99 €/mois"
            description="Pour accélérer sa trajectoire et se préparer aux entretiens exigeants."
            perks={[
              'Aube Complete + Quick illimités',
              'Exports premium (PDF, Notion, ATS)',
              'Sessions Rise & Luna illimitées',
              'Support prioritaire et coaching guidé',
            ]}
            highlight
          />
        </div>
      </section>
    </div>
  );
}
