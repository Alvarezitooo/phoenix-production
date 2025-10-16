import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getEnergyBalance, STREAK_BONUS_AMOUNT, STREAK_LENGTH_FOR_BONUS } from '@/lib/energy';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const balance = await getEnergyBalance(session.user.id);

  const remainder = balance.streakDays % STREAK_LENGTH_FOR_BONUS;
  const progressDays = balance.streakDays === 0 ? 0 : remainder === 0 ? STREAK_LENGTH_FOR_BONUS : remainder;
  const daysUntilBonus = progressDays === STREAK_LENGTH_FOR_BONUS ? 0 : STREAK_LENGTH_FOR_BONUS - progressDays;

  return NextResponse.json({
    balance: balance.balance,
    streakDays: balance.streakDays,
    lastActionAt: balance.lastActionAt,
    lastBonusAt: balance.lastBonusAt,
    bonus: {
      threshold: STREAK_LENGTH_FOR_BONUS,
      amount: STREAK_BONUS_AMOUNT,
      progressDays,
      daysUntilBonus,
    },
  });
}
