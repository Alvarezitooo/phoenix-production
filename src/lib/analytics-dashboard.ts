import dayjs from 'dayjs';
import { EnergyPackPurchaseStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatConstellationEvent } from '@/lib/constellations';

type EnergyOverview = {
  users: number;
  totalEnergy: number;
  averageEnergy: number;
  streakThreePlus: number;
};

type RecentSpend = {
  id: string;
  user: string;
  amount: number;
  action: string | null;
  createdAt: Date;
  balanceAfter: number;
};

type PackSummary = {
  purchases7d: number;
  revenue7dCents: number;
  latest: Array<{
    id: string;
    user: string;
    packId: string;
    amountCents: number | null;
    createdAt: Date;
  }>;
};

type ActivitySummary = {
  lettersPublished7d: number;
  ritualsCompleted7d: number;
  assessmentsCompleted7d: number;
};

export type StaffDashboardSnapshot = {
  energy: EnergyOverview;
  recentSpending: RecentSpend[];
  packs: PackSummary;
  activity: ActivitySummary;
  health: {
    lowEnergyUsers: Array<{ id: string; user: string; balance: number; lastActionAt: Date | null }>;
    dormantUsers7d: number;
  };
  constellations: Array<{ id: string; type: string; label: string; createdAt: Date }>;
  workers: Array<{ id: string; worker: string; processed: number; errors: number; createdAt: Date }>;
};

function formatUserName(user: { name: string | null; email: string | null }) {
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  return 'Utilisateur';
}

export async function getStaffDashboardSnapshot(): Promise<StaffDashboardSnapshot> {
  const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();

  const [
    userCount,
    energyAggregate,
    streakCount,
    topTransactions,
    packAggregate,
    packCount,
    latestPacks,
    letters7d,
    rituals7d,
    assessments7d,
    lowEnergyUsers,
    dormantUsers,
    constellationEvents,
    workerRuns,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.energyWallet.aggregate({ _sum: { balance: true }, _avg: { balance: true } }),
    prisma.energyWallet.count({ where: { currentStreakDays: { gte: 3 } } }),
    prisma.energyTransaction.findMany({
      where: { type: 'SPEND' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        metadata: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.energyPackPurchase.aggregate({
      where: {
        status: EnergyPackPurchaseStatus.PAID,
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { amountInCents: true },
    }),
    prisma.energyPackPurchase.count({
      where: {
        status: EnergyPackPurchaseStatus.PAID,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.energyPackPurchase.findMany({
      where: { status: EnergyPackPurchaseStatus.PAID },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        packId: true,
        amountInCents: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        type: 'LETTER_PUBLISHED',
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        type: 'RITUAL_COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        type: 'ASSESSMENT_COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.energyWallet.findMany({
      where: {
        balance: { lt: 15 },
      },
      orderBy: { balance: 'asc' },
      take: 10,
      select: {
        userId: true,
        balance: true,
        lastEnergyActionAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.energyWallet.count({
      where: {
        lastEnergyActionAt: {
          lt: dayjs().subtract(7, 'day').toDate(),
        },
      },
    }),
    prisma.constellationEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        type: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.workerRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        worker: true,
        processed: true,
        errors: true,
        createdAt: true,
      },
    }),
  ]);

  const energy: EnergyOverview = {
    users: userCount,
    totalEnergy: energyAggregate._sum.balance ?? 0,
    averageEnergy: Math.round(energyAggregate._avg.balance ?? 0),
    streakThreePlus: streakCount,
  };

  const recentSpending: RecentSpend[] = topTransactions.map((transaction) => {
    const metadata = (transaction.metadata ?? {}) as { action?: string };
    return {
      id: transaction.id,
      user: formatUserName(transaction.user),
      amount: Math.abs(transaction.amount),
      action: metadata.action ?? null,
      createdAt: transaction.createdAt,
      balanceAfter: transaction.balanceAfter,
    };
  });

  const packs: PackSummary = {
    purchases7d: packCount,
    revenue7dCents: packAggregate._sum.amountInCents ?? 0,
    latest: latestPacks.map((purchase) => ({
      id: purchase.id,
      user: formatUserName(purchase.user),
      packId: purchase.packId,
      amountCents: purchase.amountInCents,
      createdAt: purchase.createdAt,
    })),
  };

  const activity: ActivitySummary = {
    lettersPublished7d: letters7d,
    ritualsCompleted7d: rituals7d,
    assessmentsCompleted7d: assessments7d,
  };

  const health = {
    lowEnergyUsers: lowEnergyUsers.map((wallet) => ({
      id: wallet.userId,
      user: formatUserName(wallet.user),
      balance: wallet.balance,
      lastActionAt: wallet.lastEnergyActionAt,
    })),
    dormantUsers7d: dormantUsers,
  };

  const constellations = constellationEvents.map((event) => ({
    id: event.id,
    type: event.type,
    label: formatConstellationEvent({
      type: event.type,
      payload: (event.payload as Record<string, unknown>) ?? {},
      createdAt: event.createdAt,
    }),
    createdAt: event.createdAt,
  }));

  const workers = workerRuns.map((run) => ({
    id: run.id,
    worker: run.worker,
    processed: run.processed,
    errors: run.errors,
    createdAt: run.createdAt,
  }));

  return {
    energy,
    recentSpending,
    packs,
    activity,
    health,
    constellations,
    workers,
  };
}
