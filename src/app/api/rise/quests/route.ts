import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, ConstellationEventType, EnergyTransactionType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creditEnergy } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordConstellationEvent } from '@/lib/constellations';
import { RISE_QUESTS, RISE_BADGE_THRESHOLD, RISE_BADGE_ID } from '@/config/rise';

const completeSchema = z.object({ questId: z.string().min(1) });

function serializeProgress(progress: Array<{ questId: string; completedAt: Date; energyAwarded: number }>) {
  const map = new Map(progress.map((item) => [item.questId, item]));
  return RISE_QUESTS.map((quest) => {
    const existing = map.get(quest.id);
    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      energyReward: quest.energyReward,
      completedAt: existing?.completedAt ?? null,
      energyAwarded: existing?.energyAwarded ?? 0,
    };
  });
}

async function ensureBadge(userId: string) {
  const progressCount = await prisma.riseQuestProgress.count({ where: { userId } });
  if (progressCount < RISE_BADGE_THRESHOLD) {
    return { earned: false }; 
  }

  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: RISE_BADGE_ID } },
  });

  if (existing) {
    return { earned: true };
  }

  await prisma.userBadge.create({
    data: {
      userId,
      badgeId: RISE_BADGE_ID,
    },
  });

  await logAnalyticsEvent({
    userId,
    type: AnalyticsEventType.RISE_BADGE_AWARDED,
    metadata: { badge: RISE_BADGE_ID },
  });

  return { earned: true };
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const progress = await prisma.riseQuestProgress.findMany({
    where: { userId: session.user.id },
    orderBy: { completedAt: 'asc' },
  });

  const badge = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId: session.user.id, badgeId: RISE_BADGE_ID } },
  });

  return NextResponse.json({
    quests: serializeProgress(progress),
    badge: {
      id: RISE_BADGE_ID,
      threshold: RISE_BADGE_THRESHOLD,
      earned: Boolean(badge),
      progress: progress.length,
    },
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: z.infer<typeof completeSchema>;
  try {
    payload = completeSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  }

  const quest = RISE_QUESTS.find((item) => item.id === payload.questId);
  if (!quest) {
    return NextResponse.json({ message: 'Quest inconnue.' }, { status: 404 });
  }

  const existing = await prisma.riseQuestProgress.findUnique({
    where: { userId_questId: { userId: session.user.id, questId: quest.id } },
  });

  if (existing) {
    return NextResponse.json({ message: 'Quest déjà complétée.' }, { status: 200 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.riseQuestProgress.create({
      data: {
        userId: session.user.id,
        questId: quest.id,
        energyAwarded: quest.energyReward,
      },
    });

    if (quest.energyReward > 0) {
      await creditEnergy(session.user.id, quest.energyReward, EnergyTransactionType.BONUS, {
        reason: 'rise_quest',
        questId: quest.id,
      });
    }

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.RISE_QUEST_COMPLETED,
      metadata: {
        questId: quest.id,
        energyAwarded: quest.energyReward,
      },
    });
  });

  const badgeStatus = await ensureBadge(session.user.id);

  if (badgeStatus.earned) {
    void recordConstellationEvent({
      userId: session.user.id,
      type: ConstellationEventType.RISE_BADGE_AWARDED,
      payload: { badgeId: RISE_BADGE_ID },
    });
  }

  void recordConstellationEvent({
    userId: session.user.id,
    type: ConstellationEventType.RISE_QUEST_COMPLETED,
    payload: { questId: quest.id },
  });

  return NextResponse.json({
    ok: true,
    badgeEarned: badgeStatus.earned,
  });
}
