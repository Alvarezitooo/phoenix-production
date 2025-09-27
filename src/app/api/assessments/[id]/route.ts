import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      careerMatches: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ assessment });
}
