import dayjs from 'dayjs';
import { AnalyticsEventType, LetterPublicationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAnalyticsEvent } from '@/lib/analytics';
import { sendLetterReminderEmail } from '@/lib/mailer';

const REMINDER_DELAY_DAYS = Number.parseInt(process.env.LETTER_REMINDER_DAYS ?? '7', 10);
const MAX_REMINDERS_PER_RUN = Number.parseInt(process.env.LETTER_REMINDER_BATCH_SIZE ?? '50', 10);

export async function sendLetterReminders() {
  const referenceDate = dayjs().subtract(REMINDER_DELAY_DAYS, 'day').toDate();

  const drafts = await prisma.letterDraft.findMany({
    where: {
      updatedAt: {
        lte: referenceDate,
      },
      publication: {
        status: LetterPublicationStatus.PENDING,
      },
      reminderSentAt: null,
    },
    select: {
      id: true,
      userId: true,
      title: true,
      mirrorText: true,
      mirrorKeywords: true,
      updatedAt: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: MAX_REMINDERS_PER_RUN,
    orderBy: { updatedAt: 'asc' },
  });

  if (drafts.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;

  for (const draft of drafts) {
    if (!draft.user?.email) continue;

    try {
      await sendLetterReminderEmail({
        to: draft.user.email,
        name: draft.user.name ?? undefined,
        draftId: draft.id,
        draftTitle: draft.title ?? 'Lettre inachevée',
        updatedAt: draft.updatedAt,
        keywords: draft.mirrorKeywords?.slice(0, 3) ?? [],
      });

      await prisma.letterDraft.update({
        where: { id: draft.id },
        data: {
          reminderSentAt: new Date(),
          reminderCount: { increment: 1 },
        },
      });

      await logAnalyticsEvent({
        userId: draft.userId,
        type: AnalyticsEventType.LETTER_REMINDER_SENT,
        metadata: {
          draftId: draft.id,
          reminderCount: (draft as { reminderCount?: number }).reminderCount ?? 0,
          delayDays: REMINDER_DELAY_DAYS,
        },
      });

      processed += 1;
    } catch (error) {
      console.error('[LETTER_REMINDER_FAILED]', draft.id, error);
    }
  }

  await prisma.workerRun.create({
    data: {
      worker: 'letters-reminder',
      processed,
    },
  });

  return { processed };
}

if (require.main === module) {
  sendLetterReminders()
    .then((result) => {
      console.log(`Letter reminders processed: ${result.processed}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[LETTER_REMINDER_CRON]', error);
      process.exit(1);
    });
}
