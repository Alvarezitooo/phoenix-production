import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const updateSchema = z.object({
  notes: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().optional(),
        takeaway: z.string().optional(),
      }),
    )
    .optional(),
  summary: z.string().optional(),
});

type RiseQuestion = { question: string; competency: string; guidance: string };
type RiseNote = { question: string; answer?: string | null; takeaway?: string | null };
type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const sessionId = params?.id;

  if (!sessionId || Array.isArray(sessionId)) {
    return NextResponse.json({ message: 'Invalid session id' }, { status: 400 });
  }

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const riseSession = await prisma.riseSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!riseSession) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    const questions = (riseSession.questions as RiseQuestion[]) ?? [];
    const notes = (riseSession.notes as RiseNote[] | null) ?? [];

    return NextResponse.json({
      session: {
        id: riseSession.id,
        role: riseSession.role,
        focus: riseSession.focus,
        questions,
        notes,
        createdAt: riseSession.createdAt,
      },
    });
  } catch (error) {
    console.error('[RISE_SESSION_GET]', error);
    return NextResponse.json({ message: 'Unable to load session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const sessionId = params?.id;

  if (!sessionId || Array.isArray(sessionId)) {
    return NextResponse.json({ message: 'Invalid session id' }, { status: 400 });
  }

  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = updateSchema.parse(await request.json());

    const riseSession = await prisma.riseSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!riseSession) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    await prisma.riseSession.update({
      where: { id: riseSession.id },
      data: {
        notes: payload.notes ?? (riseSession.notes as RiseNote[] | null) ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[RISE_SESSION_UPDATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to update session' }, { status: 500 });
  }
}
