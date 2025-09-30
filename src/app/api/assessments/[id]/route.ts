import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const assessmentId = params?.id;

  if (!assessmentId || Array.isArray(assessmentId)) {
    return NextResponse.json({ message: 'Invalid assessment id' }, { status: 400 });
  }

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
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
