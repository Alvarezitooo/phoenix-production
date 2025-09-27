import type { SubscriptionPlan } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type PlanConfig = {
  priceIdEnv: string;
  label: string;
  monthlyPrice: number;
  perks: string[];
  limits: {
    assessments: number | 'unlimited';
    aiMessages: number | 'unlimited';
  };
};

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanConfig> = {
  ESSENTIAL: {
    priceIdEnv: 'STRIPE_PRICE_ESSENTIAL',
    label: 'Essentiel',
    monthlyPrice: 17.99,
    perks: [
      'Aube Quick illimité',
      'CV Builder + Letters illimités',
      '10 sessions Rise/Luna par mois',
    ],
    limits: {
      assessments: 8,
      aiMessages: 40,
    },
  },
  PRO: {
    priceIdEnv: 'STRIPE_PRICE_PRO',
    label: 'Pro',
    monthlyPrice: 29.99,
    perks: [
      'Aube Complete + Quick illimités',
      'Exports premium (PDF, Notion, ATS)',
      'Sessions Rise & Luna illimitées',
    ],
    limits: {
      assessments: 'unlimited',
      aiMessages: 'unlimited',
    },
  },
};

export function getStripePriceId(plan: SubscriptionPlan) {
  const envKey = PLAN_CONFIG[plan].priceIdEnv;
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`Stripe price id missing for plan ${plan}. Set ${envKey} in your environment.`);
  }
  return priceId;
}

export function canAccessModule(plan: SubscriptionPlan, module: 'aube-complete' | 'rise-unlimited') {
  if (plan === 'PRO') return true;
  if (module === 'aube-complete') return false;
  if (module === 'rise-unlimited') return false;
  return true;
}

export async function assertActiveSubscription(userId: string, options?: { requiredPlan?: SubscriptionPlan }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });

  if (!user || user.subscriptionStatus !== 'ACTIVE') {
    throw new Error('SUBSCRIPTION_REQUIRED');
  }

  if (options?.requiredPlan && user.subscriptionPlan !== options.requiredPlan) {
    throw new Error('PLAN_UPGRADE_REQUIRED');
  }

  return user;
}
