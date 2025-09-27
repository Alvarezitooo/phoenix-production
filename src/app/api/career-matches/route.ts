import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const matches = await prisma.careerMatch.findMany({
    where: { userId: session.user.id },
    orderBy: { compatibilityScore: 'desc' },
  });

  return NextResponse.json({ matches });
}
