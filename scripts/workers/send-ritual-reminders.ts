import dayjs from 'dayjs';
import { AnalyticsEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAnalyticsEvent } from '@/lib/analytics';
import { sendRitualReminderEmail } from '@/lib/mailer';
import { DAILY_RITUALS } from '@/config/rituals';

const REMINDER_BATCH_SIZE = Number.parseInt(process.env.RITUAL_REMINDER_BATCH_SIZE ?? '50', 10);

export async function sendRitualReminders() {
  const todayStart = dayjs().startOf('day');

  const wallets = await prisma.energyWallet.findMany({
    where: {
      OR: [
        { lastRitualReminderAt: null },
        { lastRitualReminderAt: { lt: todayStart.toDate() } },
      ],
      lastEnergyActionAt: { lt: todayStart.toDate() },
      user: {
        email: { not: '' },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    take: REMINDER_BATCH_SIZE,
    orderBy: { lastRitualReminderAt: 'asc' },
  });

  if (wallets.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const wallet of wallets) {
    const user = wallet.user;
    if (!user?.email) continue;

    const hasRitualToday = await prisma.journalEntry.count({
      where: {
        userId: user.id,
        portal: 'RITUAL',
        createdAt: {
          gte: todayStart.toDate(),
        },
      },
    });

    if (hasRitualToday > 0) {
      await prisma.energyWallet.update({
        where: { userId: user.id },
        data: { lastRitualReminderAt: new Date() },
      });
      continue;
    }

    const pendingRituals = DAILY_RITUALS.map((ritual) => ritual.title);

    try {
      await sendRitualReminderEmail({
        to: user.email,
        name: user.name ?? undefined,
        pendingRituals,
        streakDays: wallet.currentStreakDays ?? 0,
      });

      await prisma.energyWallet.update({
        where: { userId: user.id },
        data: { lastRitualReminderAt: new Date() },
      });

      await logAnalyticsEvent({
        userId: user.id,
        type: AnalyticsEventType.RITUAL_REMINDER_SENT,
        metadata: {
          ritualsPending: pendingRituals.length,
          streakDays: wallet.currentStreakDays,
        },
      });

      processed += 1;
    } catch (error) {
      errors += 1;
      console.error('[RITUAL_REMINDER_FAILED]', user.id, error);
    }
  }

  await prisma.workerRun.create({
    data: {
      worker: 'rituals-reminder',
      processed,
      errors,
    },
  });

  return { processed };
}

if (require.main === module) {
  sendRitualReminders()
    .then((result) => {
      console.log(`Ritual reminders processed: ${result.processed}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[RITUAL_REMINDER_CRON]', error);
      process.exit(1);
    });
}
