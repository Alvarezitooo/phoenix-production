import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { generateCoverLetter } from '@/lib/ai';
import { EnergyError, spendEnergy } from '@/lib/energy';
import { prisma } from '@/lib/prisma';

const mirrorPersistSchema = z.object({
  mirrorText: z.string().min(20),
  keywords: z.array(z.string().min(1)).min(1).max(8),
  emotions: z.array(z.string().min(1)).min(1).max(5),
  energyPulse: z.string().optional().nullable(),
  rune: z
    .object({
      id: z.string().min(2),
      confidence: z.number().min(0).max(1),
    })
    .nullable()
    .optional(),
});

const generateSchema = z.object({
  jobTitle: z.string().min(2),
  company: z.string().min(2),
  hiringManager: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'impactful', 'storytelling', 'executive']).default('professional'),
  language: z.enum(['fr', 'en']).default('fr'),
  highlights: z.array(z.string().min(5)).min(2),
  alignmentHooks: z.array(z.string().min(3)).optional(),
  resumeSummary: z.string().min(20),
  mirror: mirrorPersistSchema.optional(),
});

const updateSchema = z.object({
  draftId: z.string(),
  content: z.string().min(50),
  mirror: mirrorPersistSchema.optional().nullable(),
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

    try {
      await spendEnergy(session.user.id, 'letters.generate', { metadata: { module: 'letters' } });
    } catch (error) {
      if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
        return NextResponse.json({ message: 'Énergie insuffisante pour générer une lettre.' }, { status: 402 });
      }
      throw error;
    }

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
        mirrorText: payload.mirror?.mirrorText,
        mirrorKeywords: payload.mirror?.keywords ?? undefined,
        mirrorEmotions: payload.mirror?.emotions ?? undefined,
        mirrorEnergyPulse: payload.mirror?.energyPulse ?? undefined,
        runeId: payload.mirror?.rune?.id,
        runeConfidence: payload.mirror?.rune?.confidence ?? undefined,
      },
    });

    return NextResponse.json({ content, draftId: draft.id });
  } catch (error) {
    console.error('[LETTER_GENERATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
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
        mirrorText: payload.mirror?.mirrorText ?? draft.mirrorText,
        mirrorKeywords: payload.mirror?.keywords ?? draft.mirrorKeywords ?? undefined,
        mirrorEmotions: payload.mirror?.emotions ?? draft.mirrorEmotions ?? undefined,
        mirrorEnergyPulse: payload.mirror?.energyPulse ?? draft.mirrorEnergyPulse ?? undefined,
        runeId: payload.mirror?.rune?.id ?? draft.runeId,
        runeConfidence: payload.mirror?.rune?.confidence ?? draft.runeConfidence ?? undefined,
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
