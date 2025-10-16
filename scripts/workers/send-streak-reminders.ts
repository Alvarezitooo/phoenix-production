import dayjs from 'dayjs';
import { AnalyticsEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAnalyticsEvent } from '@/lib/analytics';
import { sendRitualReminderEmail } from '@/lib/mailer';
import { DAILY_RITUALS } from '@/config/rituals';

const STREAK_THRESHOLD = Number.parseInt(process.env.STREAK_REMINDER_THRESHOLD ?? '3', 10);
const STREAK_REMINDER_BATCH = Number.parseInt(process.env.STREAK_REMINDER_BATCH_SIZE ?? '20', 10);

export async function sendStreakReminders() {
  const today = dayjs();
  const cutoff = today.subtract(1, 'day').toDate();

  const wallets = await prisma.energyWallet.findMany({
    where: {
      currentStreakDays: { gte: STREAK_THRESHOLD },
      OR: [
        { lastStreakReminderAt: null },
        { lastStreakReminderAt: { lt: cutoff } },
      ],
      user: {
        email: { not: null },
      },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { lastStreakReminderAt: 'asc' },
    take: STREAK_REMINDER_BATCH,
  });

  let processed = 0;
  let errors = 0;

  for (const wallet of wallets) {
    const user = wallet.user;
    if (!user?.email) continue;

    try {
      await sendRitualReminderEmail({
        to: user.email,
        name: user.name ?? undefined,
        pendingRituals: DAILY_RITUALS.map((ritual) => ritual.title),
        streakDays: wallet.currentStreakDays ?? 0,
      });

      await prisma.energyWallet.update({
        where: { userId: user.id },
        data: { lastStreakReminderAt: new Date() },
      });

      await logAnalyticsEvent({
        userId: user.id,
        type: AnalyticsEventType.RITUAL_REMINDER_SENT,
        metadata: {
          reminderType: 'streak',
          streakDays: wallet.currentStreakDays,
        },
      });

      processed += 1;
    } catch (error) {
      errors += 1;
      console.error('[STREAK_REMINDER_FAILED]', user.id, error);
    }
  }

  await prisma.workerRun.create({
    data: {
      worker: 'streak-reminder',
      processed,
      errors,
    },
  });

  return { processed };
}

if (require.main === module) {
  sendStreakReminders()
    .then((result) => {
      console.log(`Streak reminders processed: ${result.processed}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[STREAK_REMINDER_CRON]', error);
      process.exit(1);
    });
}
