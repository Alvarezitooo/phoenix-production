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
    riseSessions: number | 'unlimited';
    resumeGenerations: number | 'unlimited';
    letterGenerations: number | 'unlimited';
  };
};

type UsageKey = keyof PlanConfig['limits'];

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanConfig> = {
  DISCOVERY: {
    priceIdEnv: 'STRIPE_PRICE_DISCOVERY',
    label: 'Découverte',
    monthlyPrice: 0,
    perks: [
      '1 analyse Aube Express',
      'Génération CV limitée',
      '3 interactions Rise/Luna',
    ],
    limits: {
      assessments: 1,
      aiMessages: 3,
      riseSessions: 1,
      resumeGenerations: 1,
      letterGenerations: 0,
    },
  },
  ESSENTIAL: {
    priceIdEnv: 'STRIPE_PRICE_ESSENTIAL',
    label: 'Essentiel',
    monthlyPrice: 19.9,
    perks: [
      'Aube Express illimitée',
      'Créateur de CV + Studio Lettres (5/mois)',
      '20 interactions Rise/Luna par mois',
    ],
    limits: {
      assessments: 12,
      aiMessages: 20,
      riseSessions: 'unlimited',
      resumeGenerations: 'unlimited',
      letterGenerations: 5,
    },
  },
  PRO: {
    priceIdEnv: 'STRIPE_PRICE_PRO',
    label: 'Pro',
    monthlyPrice: 34.9,
    perks: [
      'Aube Complete illimitée',
      'Exports premium (PDF, Notion, ATS)',
      'Rise & Luna illimités + support prioritaire',
    ],
    limits: {
      assessments: 'unlimited',
      aiMessages: 'unlimited',
      riseSessions: 'unlimited',
      resumeGenerations: 'unlimited',
      letterGenerations: 'unlimited',
    },
  },
};

export function getStripePriceId(plan: SubscriptionPlan) {
  if (plan === 'DISCOVERY') {
    throw new Error('Discovery plan does not require Stripe price id');
  }
  const envKey = PLAN_CONFIG[plan].priceIdEnv;
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`Stripe price id missing for plan ${plan}. Set ${envKey} in your environment.`);
  }
  return priceId;
}

export function canAccessModule(plan: SubscriptionPlan, module: 'aube-complete' | 'rise-unlimited') {
  if (plan === 'PRO') return true;
  if (plan === 'ESSENTIAL') {
    if (module === 'aube-complete') return false;
    if (module === 'rise-unlimited') return false;
    return true;
  }
  if (plan === 'DISCOVERY') {
    if (module === 'aube-complete') return false;
    if (module === 'rise-unlimited') return false;
    return false;
  }
  if (module === 'aube-complete') return false;
  if (module === 'rise-unlimited') return false;
  return true;
}

export async function assertActiveSubscription(
  userId: string,
  options?: { requiredPlan?: SubscriptionPlan; enforcePeriod?: boolean },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true, subscriptionStatus: true, currentPeriodEnd: true, currentPeriodStart: true },
  });

  if (!user || user.subscriptionStatus !== 'ACTIVE') {
    throw new Error('SUBSCRIPTION_REQUIRED');
  }

  if (options?.enforcePeriod !== false && user.currentPeriodEnd && user.currentPeriodEnd.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'INACTIVE',
      },
    });
    throw new Error('SUBSCRIPTION_REQUIRED');
  }

  if (options?.requiredPlan && user.subscriptionPlan !== options.requiredPlan) {
    throw new Error('PLAN_UPGRADE_REQUIRED');
  }

  return user;
}

export async function assertWithinQuota(userId: string, usage: UsageKey) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  if (!user?.subscriptionPlan) {
    throw new Error('SUBSCRIPTION_REQUIRED');
  }

  const limit = PLAN_CONFIG[user.subscriptionPlan].limits[usage];
  if (limit === 'unlimited') {
    return { remaining: 'unlimited' as const };
  }

  const { periodStart, periodEnd } = getCurrentPeriodBounds(user.currentPeriodStart, user.currentPeriodEnd);
  const used = await computeUsage(userId, usage, periodStart, periodEnd);
  const remaining = Math.max(limit - used, 0);

  if (remaining <= 0) {
    throw new Error('QUOTA_EXCEEDED');
  }

  return { remaining, used, limit };
}

function getCurrentPeriodBounds(currentPeriodStart: Date | null | undefined, currentPeriodEnd: Date | null | undefined) {
  const now = new Date();
  if (currentPeriodStart && currentPeriodEnd) {
    return { periodStart: currentPeriodStart, periodEnd: currentPeriodEnd };
  }

  if (currentPeriodEnd) {
    const start = new Date(currentPeriodEnd.getTime());
    start.setUTCMonth(start.getUTCMonth() - 1);
    return { periodStart: start, periodEnd: currentPeriodEnd };
  }

  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart: startOfMonth, periodEnd: endOfMonth };
}

async function computeUsage(userId: string, usage: UsageKey, periodStart: Date, periodEnd: Date) {
  if (usage === 'assessments') {
    return prisma.assessment.count({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  if (usage === 'aiMessages') {
    return prisma.analyticsEvent.count({
      where: {
        userId,
        type: 'CHAT_MESSAGE',
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  if (usage === 'riseSessions') {
    return prisma.riseSession.count({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  if (usage === 'resumeGenerations') {
    return prisma.resumeDraft.count({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  if (usage === 'letterGenerations') {
    return prisma.letterDraft.count({
      where: {
        userId,
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
  }

  return 0;
}
