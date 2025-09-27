import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [user, assessments, matches, conversations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    }),
    prisma.assessment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.careerMatch.findMany({
      where: { userId: session.user.id },
      orderBy: { compatibilityScore: 'desc' },
      take: 3,
    }),
    prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
  ]);

  return NextResponse.json({
    user,
    assessments,
    matches,
    conversations,
  });
}
