import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, ConstellationEventType, EnergyTransactionType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creditEnergy } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordConstellationEvent } from '@/lib/constellations';

const schema = z.object({ code: z.string().min(4) });

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  }

  const referralLink = await prisma.referralLink.findUnique({ where: { code: payload.code } });
  if (!referralLink) {
    return NextResponse.json({ message: 'Code parrainage introuvable.' }, { status: 404 });
  }

  if (referralLink.userId === session.user.id) {
    return NextResponse.json({ message: 'Tu ne peux pas utiliser ton propre code.' }, { status: 400 });
  }

  const alreadyClaimed = await prisma.referralEvent.findFirst({
    where: {
      referrerId: referralLink.userId,
      referredUserId: session.user.id,
    },
  });

  if (alreadyClaimed) {
    return NextResponse.json({ message: 'Parrainage déjà enregistré.' }, { status: 200 });
  }

  const bonus = referralLink.bonusEnergy;

  await prisma.$transaction(async (tx) => {
    await tx.referralEvent.create({
      data: {
        referralLinkId: referralLink.id,
        referrerId: referralLink.userId,
        referredUserId: session.user.id,
        bonusGranted: bonus,
      },
    });

    await creditEnergy(referralLink.userId, bonus, EnergyTransactionType.BONUS, {
      reason: 'referral_bonus',
      referredUserId: session.user.id,
    });

    await logAnalyticsEvent({
      userId: referralLink.userId,
      type: AnalyticsEventType.REFERRAL_BONUS_GRANTED,
      metadata: {
        referralCode: referralLink.code,
        bonus,
        referredUserId: session.user.id,
      },
    }).catch(() => undefined);
  });

  void recordConstellationEvent({
    userId: referralLink.userId,
    type: ConstellationEventType.REFERRAL_BONUS,
    payload: { referredUserId: session.user.id, bonus },
  });

  return NextResponse.json({ ok: true, bonus });
}
