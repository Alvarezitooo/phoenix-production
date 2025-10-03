import { redirect } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PLAN_CONFIG } from '@/lib/subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ManageBillingButton } from '@/components/billing/manage-billing-button';

function formatDate(date: Date | null | undefined) {
  if (!date) return null;
  return dayjs(date).locale('fr').format('D MMMM YYYY');
}

const STATUS_LABELS: Record<string, { label: string; description: string; tone: 'success' | 'warning' | 'danger' | 'info' }> = {
  ACTIVE: {
    label: 'Actif',
    description: 'Votre abonnement est en cours. Continuez à profiter de tous les modules Phoenix.',
    tone: 'success',
  },
  PAST_DUE: {
    label: 'Paiement requis',
    description: 'Nous n’avons pas pu finaliser votre dernier paiement. Mettez à jour vos informations pour conserver l’accès.',
    tone: 'warning',
  },
  CANCELED: {
    label: 'Résilié',
    description: 'Votre accès prendra fin à la date indiquée. Vous pouvez relancer un plan à tout moment.',
    tone: 'danger',
  },
  INACTIVE: {
    label: 'Inactif',
    description: 'Activez un plan Essentiel ou Pro pour débloquer les modules IA et les exports.',
    tone: 'info',
  },
};

const TONE_CLASSES: Record<'success' | 'warning' | 'danger' | 'info', string> = {
  success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  danger: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
  info: 'border-white/15 bg-white/5 text-white/70',
};

async function fetchSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      currentPeriodStart: true,
      stripeCustomerId: true,
    },
  });
}

function getPlanPerks(plan: keyof typeof PLAN_CONFIG) {
  return PLAN_CONFIG[plan].perks;
}

export default async function BillingPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/auth/sign-in');
  }

  const subscription = await fetchSubscription(session.user.id);

  if (!subscription) {
    redirect('/dashboard');
  }

  const planKey = (subscription.subscriptionPlan ?? 'ESSENTIAL') as keyof typeof PLAN_CONFIG;
  const plan = PLAN_CONFIG[planKey];
  const statusKey = subscription.subscriptionStatus ?? 'INACTIVE';
  const status = STATUS_LABELS[statusKey] ?? STATUS_LABELS.INACTIVE;
  const renewalDate = formatDate(subscription.currentPeriodEnd);
  const periodStart = formatDate(subscription.currentPeriodStart);

  return (
    <div className="space-y-8 text-white">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Mon abonnement</h1>
        <p className="text-sm text-white/60">
          Visualisez votre statut, mettez à jour vos informations de paiement et découvrez les avantages inclus dans votre formule.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Statut actuel</CardTitle>
            <CardDescription>Informations issues de votre espace Stripe sécurisé.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-white/70">
            <div className={`flex flex-col gap-2 rounded-3xl border ${TONE_CLASSES[status.tone]} p-4 text-sm`}>
              <span className="text-xs uppercase tracking-wide text-white/60">Statut</span>
              <div className="text-lg font-semibold text-white">{status.label}</div>
              <p>{status.description}</p>
              {renewalDate && (
                <p className="text-xs text-white/50">
                  Prochaine échéance&nbsp;: <span className="font-medium text-white/80">{renewalDate}</span>
                </p>
              )}
              {periodStart && (
                <p className="text-xs text-white/50">
                  Période en cours depuis le <span className="font-medium text-white/80">{periodStart}</span>
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs uppercase tracking-wide text-white/60">Formule</span>
                <div className="mt-1 text-lg font-semibold text-white">Plan {plan.label}</div>
                <p className="text-xs text-white/50">{plan.monthlyPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / mois TTC</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs uppercase tracking-wide text-white/60">Gestion</span>
                <div className="mt-1 text-sm text-white/80">Mettre à jour vos coordonnées de paiement ou vos factures.</div>
                {subscription.stripeCustomerId ? (
                  <ManageBillingButton />
                ) : (
                  <Link
                    href="/pricing"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Activer un plan
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Avantages inclus</CardTitle>
            <CardDescription>
              Chaque plan donne accès à un ensemble d’outils IA et de modules d’accompagnement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <ul className="space-y-2">
              {getPlanPerks(planKey).map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            {planKey === 'ESSENTIAL' && (
              <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-xs text-indigo-100">
                Envie d’analyses complètes et d’un coaching illimité ? Découvrez le plan Pro et accédez à Aube Complete, aux exports premium et aux sessions Rise &amp; Luna illimitées.
                <div className="mt-3">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
                  >
                    Comparer les offres
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Besoin d’aide ?</CardTitle>
          <CardDescription>Nos équipes répondent en moins de 24h ouvrées.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/70">
          <p>
            Pour toute question sur votre abonnement, contactez-nous à&nbsp;
            <a href="mailto:support@phoenix-career.fr" className="text-emerald-200 hover:text-emerald-100">
              support@phoenix-career.fr
            </a>
            .
          </p>
          <Link
            href="mailto:support@phoenix-career.fr"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Écrire au support
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
