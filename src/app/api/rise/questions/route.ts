import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { getInterviewPracticeSet } from '@/lib/ai';
import { assertActiveSubscription, assertWithinQuota } from '@/lib/subscription';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  role: z.string().min(2),
  focus: z.enum(['behavioral', 'strategic', 'technical']).default('behavioral'),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    const subscription = await assertActiveSubscription(session.user.id);
    try {
      await assertWithinQuota(session.user.id, 'riseSessions');
    } catch (error) {
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        return NextResponse.json(
          {
            message:
              subscription?.subscriptionPlan === 'DISCOVERY'
                ? 'Le plan Découverte inclut un atelier Rise. Passez au plan Essentiel pour multiplier vos simulations.'
                : 'Quota atteint pour les ateliers Rise ce mois-ci.',
          },
          { status: 429 },
        );
      }
      if (error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED') {
        return NextResponse.json({ message: 'Abonnement requis pour pratiquer Rise.' }, { status: 402 });
      }
      throw error;
    }

    const questions = await getInterviewPracticeSet(payload);

    const sessionRecord = await prisma.riseSession.create({
      data: {
        userId: session.user.id,
        role: payload.role,
        focus: payload.focus,
        questions,
      },
    });

    return NextResponse.json({ questions, sessionId: sessionRecord.id });
  } catch (error) {
    console.error('[RISE_QUESTIONS]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ message: 'Abonnement requis pour pratiquer Rise.' }, { status: 402 });
    }
    return NextResponse.json({ message: 'Unable to fetch interview set' }, { status: 500 });
  }
}
