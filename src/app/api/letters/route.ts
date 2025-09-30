import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { generateCoverLetter } from '@/lib/ai';
import { assertActiveSubscription } from '@/lib/subscription';
import { prisma } from '@/lib/prisma';

const generateSchema = z.object({
  jobTitle: z.string().min(2),
  company: z.string().min(2),
  hiringManager: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'impactful', 'storytelling', 'executive']).default('professional'),
  language: z.enum(['fr', 'en']).default('fr'),
  highlights: z.array(z.string().min(5)).min(2),
  alignmentHooks: z.array(z.string().min(3)).optional(),
  resumeSummary: z.string().min(20),
});

const updateSchema = z.object({
  draftId: z.string(),
  content: z.string().min(50),
});

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const draftId = url.searchParams.get('draftId');

  if (!draftId) {
    return NextResponse.json({ message: 'Missing draftId parameter' }, { status: 400 });
  }

  const draft = await prisma.letterDraft.findFirst({
    where: { id: draftId, userId: session.user.id },
  });

  if (!draft) {
    return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = generateSchema.parse(await request.json());
    await assertActiveSubscription(session.user.id);

    const content = await generateCoverLetter(payload);

    const draft = await prisma.letterDraft.create({
      data: {
        userId: session.user.id,
        title: `${payload.jobTitle} — ${payload.company}`,
        template: 'modern',
        tone: payload.tone,
        language: payload.language,
        content: {
          letterMarkdown: content,
          highlights: payload.highlights,
          alignmentHooks: payload.alignmentHooks ?? [],
          input: payload,
        },
      },
    });

    return NextResponse.json({ content, draftId: draft.id });
  } catch (error) {
    console.error('[LETTER_GENERATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === 'SUBSCRIPTION_REQUIRED') {
        return NextResponse.json({ message: 'Abonnement requis pour générer une lettre.' }, { status: 402 });
      }
      if (error.message === 'PLAN_UPGRADE_REQUIRED') {
        return NextResponse.json({ message: 'Plan insuffisant pour générer la lettre.' }, { status: 403 });
      }
    }
    return NextResponse.json({ message: 'Unable to generate letter' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = updateSchema.parse(await request.json());

    const draft = await prisma.letterDraft.findFirst({
      where: { id: payload.draftId, userId: session.user.id },
    });

    if (!draft) {
      return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
    }

    await prisma.letterDraft.update({
      where: { id: draft.id },
      data: {
        content: {
          ...((draft.content ?? {}) as Record<string, unknown>),
          letterMarkdown: payload.content,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LETTER_UPDATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to update letter' }, { status: 500 });
  }
}
