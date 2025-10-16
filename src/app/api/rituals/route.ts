import dayjs from 'dayjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, EmbeddingSourceType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DAILY_RITUALS } from '@/config/rituals';
import { creditEnergy, EnergyError } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordEmotionalMemory } from '@/lib/memory';

function startOfToday() {
  return dayjs().startOf('day').toDate();
}

const completeSchema = z.object({ id: z.string() });

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const today = startOfToday();
  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: session.user.id,
      portal: 'RITUAL',
      createdAt: {
        gte: today,
      },
    },
    select: { promptKey: true, createdAt: true },
  });

  const completed = new Set(entries.map((entry) => entry.promptKey));

  return NextResponse.json({
    rituals: DAILY_RITUALS.map((ritual) => ({
      ...ritual,
      completed: completed.has(ritual.id),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = completeSchema.parse(await request.json());
    const ritual = DAILY_RITUALS.find((item) => item.id === payload.id);
    if (!ritual) {
      return NextResponse.json({ message: 'Rituel inconnu' }, { status: 400 });
    }

    const today = startOfToday();
    const alreadyDone = await prisma.journalEntry.findFirst({
      where: {
        userId: session.user.id,
        portal: 'RITUAL',
        promptKey: ritual.id,
        createdAt: {
          gte: today,
        },
      },
      select: { id: true },
    });

    if (alreadyDone) {
      return NextResponse.json({ message: 'Rituel déjà complété.' }, { status: 200 });
    }

    let entryId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          userId: session.user.id,
          portal: 'RITUAL',
          promptKey: ritual.id,
          content: ritual.title,
          metadata: { description: ritual.description },
        },
      });
      entryId = entry.id;
      if (ritual.energyReward > 0) {
        await creditEnergy(session.user.id, ritual.energyReward, 'BONUS', { source: 'ritual', ritualId: ritual.id });
      }
    });

    if (entryId) {
      void recordEmotionalMemory({
        userId: session.user.id,
        sourceType: EmbeddingSourceType.JOURNAL_ENTRY,
        sourceId: entryId,
        content: ritual.description ?? ritual.title,
      }).catch((error) => console.error('[RITUAL_MEMORY]', error));
    }

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.RITUAL_COMPLETED,
      metadata: {
        ritualId: ritual.id,
        reward: ritual.energyReward,
      },
    });

    return NextResponse.json({ ok: true, reward: ritual.energyReward });
  } catch (error) {
    console.error('[RITUAL_COMPLETE]', error);
    if (error instanceof EnergyError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Impossible d’enregistrer ce rituel' }, { status: 500 });
  }
}
