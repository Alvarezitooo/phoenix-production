import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  matchId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    const matchId = payload.matchId ?? null;

    if (matchId) {
      const match = await prisma.careerMatch.findFirst({
        where: { id: matchId, userId: session.user.id },
        select: { id: true },
      });
      if (!match) {
        return NextResponse.json({ message: 'Trajectoire introuvable.' }, { status: 404 });
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferredCareerMatchId: matchId,
      },
    });

    return NextResponse.json({ ok: true, matchId });
  } catch (error) {
    console.error('[CAREER_MATCH_SELECT]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Payload invalide', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Impossible de définir la trajectoire' }, { status: 500 });
  }
}
