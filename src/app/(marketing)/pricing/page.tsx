import { Metadata } from 'next';
import { PlanCard } from '@/components/pricing/plan-card';
import type { SubscriptionPlan } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Plans & Tarifs | Phoenix',
  description: "Choisissez l’abonnement Phoenix qui correspond à vos objectifs de carrière.",
};

export default function PricingPage() {
  const PLAN_DISCOVERY: SubscriptionPlan = 'DISCOVERY';
  const PLAN_ESSENTIAL: SubscriptionPlan = 'ESSENTIAL';
  const PLAN_PRO: SubscriptionPlan = 'PRO';

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Plans mensuels</p>
          <h1 className="text-3xl font-semibold text-white">Commencez gratuitement, évoluez à votre rythme</h1>
          <p className="max-w-2xl text-sm text-white/60">
            Activez votre accès Découverte pour tester Aube et les livrables Phoenix. Passez ensuite au plan Essentiel ou Pro selon
            l’intensité de votre recherche : toutes nos offres sont sans engagement, sans système de crédits cachés.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <PlanCard
            plan={PLAN_DISCOVERY}
            title="Découverte"
            price="Gratuit"
            description="Accédez à Aube, au CV et à Luna pour une première exploration sans frais."
            perks={[
              '1 analyse Aube Express',
              '1 génération de CV (export Markdown)',
              '3 interactions Rise/Luna',
            ]}
            ctaLabel="Activer mon accès"
          />
          <PlanCard
            plan={PLAN_ESSENTIAL}
            title="Essentiel"
            price="19,90 €/mois"
            description="Pour structurer ses candidatures et alimenter ses entretiens."
            perks={[
              'Aube Express illimitée',
              'CV & Lettres (5/mois)',
              '20 interactions Rise/Luna par mois',
              'Exports Docx & Markdown',
            ]}
            ctaLabel="Choisir Essentiel"
          />
          <PlanCard
            plan={PLAN_PRO}
            title="Pro"
            price="34,90 €/mois"
            description="Pour orchestrer une transition stratégique avec un accompagnement intensif."
            perks={[
              'Aube Complete illimitée',
              'Exports premium (PDF, Notion, ATS)',
              'Rise & Luna illimités',
              'Webinaire mensuel & support prioritaire',
            ]}
            highlight
            ctaLabel="Choisir Pro"
          />
        </div>
      </section>
    </div>
  );
}
