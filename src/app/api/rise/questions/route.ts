import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { getInterviewPracticeSet } from '@/lib/ai';
import { EnergyError, spendEnergy } from '@/lib/energy';
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

    try {
      await spendEnergy(session.user.id, 'rise.generate', {
        metadata: { module: 'rise', focus: payload.focus },
      });
    } catch (error) {
      if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
        return NextResponse.json({ message: 'Énergie insuffisante pour lancer un atelier Rise.' }, { status: 402 });
      }
      throw error;
    }

    const questions = await getInterviewPracticeSet(payload, { userId: session.user.id });

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
    return NextResponse.json({ message: 'Unable to fetch interview set' }, { status: 500 });
  }
}
