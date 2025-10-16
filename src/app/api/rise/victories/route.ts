import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, ConstellationEventType, EnergyTransactionType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creditEnergy } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordConstellationEvent } from '@/lib/constellations';

const createSchema = z.object({
  note: z.string().min(10, 'Décris ta victoire en quelques phrases.'),
  energyDeclared: z.number().min(0).max(10).optional().default(0),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const victories = await prisma.riseVictory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    victories: victories.map((victory) => ({
      id: victory.id,
      note: victory.note,
      energyDeclared: victory.energyDeclared,
      createdAt: victory.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.riseVictory.create({
      data: {
        userId: session.user.id,
        note: payload.note,
        energyDeclared: payload.energyDeclared ?? 0,
      },
    });

    if ((payload.energyDeclared ?? 0) > 0) {
      await creditEnergy(session.user.id, payload.energyDeclared ?? 0, EnergyTransactionType.BONUS, {
        reason: 'rise_victory',
      });
    }

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.RISE_VICTORY_LOGGED,
      metadata: {
        energyDeclared: payload.energyDeclared ?? 0,
      },
    });
  });

  void recordConstellationEvent({
    userId: session.user.id,
    type: ConstellationEventType.RISE_VICTORY_LOGGED,
    payload: { energyDeclared: payload.energyDeclared ?? 0 },
  });

  return NextResponse.json({ ok: true });
}
