import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const draftId = url.searchParams.get('draftId');

  if (draftId) {
    const draft = await prisma.resumeDraft.findFirst({
      where: { id: draftId, userId: session.user.id },
    });

    if (!draft) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ draft });
  }

  const drafts = await prisma.resumeDraft.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: { feedback: { orderBy: { createdAt: 'desc' } } },
  });

  return NextResponse.json({ drafts });
}

const updateSchema = z.object({
  draftId: z.string(),
  content: z.string().min(10),
  alignScore: z.number().min(0).max(100).nullable().optional(),
});

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = updateSchema.parse(await request.json());

    const draft = await prisma.resumeDraft.findFirst({
      where: { id: payload.draftId, userId: session.user.id },
    });

    if (!draft) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
    }

    await prisma.resumeDraft.update({
      where: { id: draft.id },
      data: {
        content: {
          ...((draft.content ?? {}) as Record<string, unknown>),
          resumeMarkdown: payload.content,
        },
        alignScore: payload.alignScore ?? draft.alignScore,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[CV_DRAFT_UPDATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to update draft' }, { status: 500 });
  }
}
