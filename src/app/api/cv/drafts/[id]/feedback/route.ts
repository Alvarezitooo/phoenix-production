import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const feedbackSchema = z.object({
  section: z.string().min(1),
  message: z.string().min(5),
});

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const draftId = params?.id;

  if (!draftId || Array.isArray(draftId)) {
    return NextResponse.json({ message: 'Invalid draft id' }, { status: 400 });
  }

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = feedbackSchema.parse(await request.json());

    const draft = await prisma.resumeDraft.findFirst({
      where: {
        id: draftId,
        userId: session.user.id,
      },
    });

    if (!draft) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
    }

    const feedback = await prisma.resumeFeedback.create({
      data: {
        draftId: draft.id,
        section: payload.section,
        message: payload.message,
      },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('[CV_FEEDBACK]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to add feedback' }, { status: 500 });
  }
}
