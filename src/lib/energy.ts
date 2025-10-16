import dayjs from 'dayjs';
import { AnalyticsEventType, EnergyTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ENERGY_COSTS, STREAK_BONUS_AMOUNT, STREAK_LENGTH_FOR_BONUS, type EnergyActionKey } from '@/config/energy';
import { logAnalyticsEvent } from '@/lib/analytics';

export { ENERGY_COSTS, STREAK_BONUS_AMOUNT, STREAK_LENGTH_FOR_BONUS } from '@/config/energy';

export class EnergyError extends Error {
  constructor(
    public code: 'INSUFFICIENT_ENERGY' | 'INVALID_ACTION',
    message: string,
  ) {
    super(message);
    this.name = 'EnergyError';
  }
}

function startOfDay(date: Date) {
  return dayjs(date).startOf('day');
}

async function ensureWallet(userId: string, tx = prisma) {
  return tx.energyWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { transactions: false },
  });
}

export async function getEnergyBalance(userId: string) {
  const wallet = await ensureWallet(userId);
  return {
    balance: wallet.balance,
    streakDays: wallet.currentStreakDays,
    streakCount: wallet.streakCount,
    lastActionAt: wallet.lastEnergyActionAt,
    lastBonusAt: wallet.lastBonusAwardedAt,
  };
}

export async function creditEnergy(
  userId: string,
  amount: number,
  type: EnergyTransactionType,
  metadata?: Record<string, unknown>,
  reference?: string,
) {
  if (amount <= 0) {
    throw new EnergyError('INVALID_ACTION', 'Credit amount must be positive');
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await ensureWallet(userId, tx);
    const updated = await tx.energyWallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        lifetimeEarned: { increment: amount },
        lastEnergyActionAt: now,
      },
    });

    await tx.energyTransaction.create({
      data: {
        userId,
        type,
        amount,
        balanceAfter: updated.balance,
        metadata,
        reference,
      },
    });

    return updated.balance;
  });
}

type SpendOptions = {
  metadata?: Record<string, unknown>;
  reference?: string;
  costOverride?: number;
};

type SpendResult = {
  balance: number;
  bonusAwarded: number;
  streakDays: number;
};

export async function spendEnergy(userId: string, action: EnergyActionKey, options: SpendOptions = {}): Promise<SpendResult> {
  const cost = options.costOverride ?? ENERGY_COSTS[action];
  if (typeof cost !== 'number' || cost < 0) {
    throw new EnergyError('INVALID_ACTION', `Invalid energy action: ${action}`);
  }

  if (cost === 0) {
    const wallet = await ensureWallet(userId);
    return { balance: wallet.balance, bonusAwarded: 0, streakDays: wallet.currentStreakDays };
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(userId, tx);

    if (wallet.balance < cost) {
      throw new EnergyError('INSUFFICIENT_ENERGY', 'Solde énergie insuffisant');
    }

    const lastActionDay = wallet.lastEnergyActionAt ? startOfDay(wallet.lastEnergyActionAt) : null;
    const today = startOfDay(now);
    let newStreakDays = wallet.currentStreakDays ?? 0;

    if (!lastActionDay) {
      newStreakDays = 1;
    } else {
      const diff = today.diff(lastActionDay, 'day');
      if (diff === 0) {
        // same day, streak stays the same
      } else if (diff === 1) {
        newStreakDays += 1;
      } else {
        newStreakDays = 1;
      }
    }

    const updated = await tx.energyWallet.update({
      where: { userId },
      data: {
        balance: { decrement: cost },
        lifetimeSpent: { increment: cost },
        currentStreakDays: newStreakDays,
        lastEnergyActionAt: now,
      },
    });

    await tx.energyTransaction.create({
      data: {
        userId,
        type: EnergyTransactionType.SPEND,
        amount: -cost,
        balanceAfter: updated.balance,
        metadata: { action, ...options.metadata },
        reference: options.reference ?? action,
      },
    });

    let bonusAwarded = 0;
    let finalBalance = updated.balance;

    const shouldAwardBonus =
      newStreakDays > 0 &&
      newStreakDays % STREAK_LENGTH_FOR_BONUS === 0 &&
      (!wallet.lastBonusAwardedAt || today.diff(startOfDay(wallet.lastBonusAwardedAt), 'day') >= STREAK_LENGTH_FOR_BONUS);

    if (shouldAwardBonus) {
      const afterBonus = await tx.energyWallet.update({
        where: { userId },
        data: {
          balance: { increment: STREAK_BONUS_AMOUNT },
          lifetimeEarned: { increment: STREAK_BONUS_AMOUNT },
          streakCount: { increment: 1 },
          lastBonusAwardedAt: now,
        },
      });

      await tx.energyTransaction.create({
        data: {
          userId,
          type: EnergyTransactionType.BONUS,
          amount: STREAK_BONUS_AMOUNT,
          balanceAfter: afterBonus.balance,
          metadata: { reason: 'STREAK', streakDays: newStreakDays },
          reference: 'streak-bonus',
        },
      });

      bonusAwarded = STREAK_BONUS_AMOUNT;
      finalBalance = afterBonus.balance;
      newStreakDays = afterBonus.currentStreakDays;
    }

    return {
      balance: finalBalance,
      bonusAwarded,
      streakDays: newStreakDays,
    };
  });

  const analyticsMetadata = {
    action,
    cost,
    reference: options.reference ?? action,
    balanceAfter: result.balance,
    bonusAwarded: result.bonusAwarded,
    streakDays: result.streakDays,
    ...(options.metadata ?? {}),
  } satisfies Record<string, unknown>;

  try {
    await logAnalyticsEvent({
      userId,
      type: AnalyticsEventType.ENERGY_SPENT,
      metadata: analyticsMetadata,
    });
  } catch (error) {
    console.error('[ENERGY_SPENT_EVENT]', error);
  }

  if (result.bonusAwarded > 0) {
    await logAnalyticsEvent({
      userId,
      type: AnalyticsEventType.ENERGY_BONUS_STREAK,
      metadata: { bonus: result.bonusAwarded, streakDays: result.streakDays },
    });
  }

  return result;
}

export async function getEnergyHistory(userId: string, limit = 50) {
  await ensureWallet(userId);
  const transactions = await prisma.energyTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return transactions;
}
