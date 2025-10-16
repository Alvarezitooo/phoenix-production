import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, ConstellationEventType, EmbeddingSourceType, LetterPublicationStatus } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { spendEnergy, EnergyError } from '@/lib/energy';
import { LETTER_PUBLICATION_COST } from '@/config/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordEmotionalMemory } from '@/lib/memory';
import { recordConstellationEvent } from '@/lib/constellations';

const publishSchema = z.object({
  draftId: z.string().min(1),
  excerpt: z.string().min(40).max(600).optional(),
  anonymous: z.boolean().optional().default(true),
});

type PublishPayload = z.infer<typeof publishSchema>;

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: PublishPayload;
  try {
    payload = publishSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Paramètres invalides', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Requête illisible' }, { status: 400 });
  }

  try {
    const draft = await prisma.letterDraft.findFirst({
      where: { id: payload.draftId, userId: session.user.id },
    });

    if (!draft) {
      return NextResponse.json({ message: 'Brouillon introuvable.' }, { status: 404 });
    }

    if (!draft.mirrorText || !draft.runeId) {
      return NextResponse.json({ message: 'Complète le miroir Luna avant de publier.' }, { status: 400 });
    }

    const existing = await prisma.letterPublication.findUnique({ where: { draftId: draft.id } });
    if (existing && existing.status !== LetterPublicationStatus.REJECTED) {
      return NextResponse.json({ message: 'Cette lettre est déjà en cours de publication.' }, { status: 409 });
    }

    const isRepublish = existing?.status === LetterPublicationStatus.REJECTED;

    try {
      await spendEnergy(session.user.id, 'letters.publish', {
        metadata: { source: 'letters_publish', draftId: draft.id },
      });
    } catch (error) {
      if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
        return NextResponse.json({ message: 'Énergie insuffisante pour publier la lettre.' }, { status: 402 });
      }
      throw error;
    }

    const excerpt = payload.excerpt ?? draft.mirrorText.slice(0, 240) + (draft.mirrorText.length > 240 ? '…' : '');

    let publication;
    if (isRepublish && existing) {
      publication = await prisma.letterPublication.update({
        where: { id: existing.id },
        data: {
          status: LetterPublicationStatus.PENDING,
          isAnonymous: payload.anonymous,
          excerpt,
          runeId: draft.runeId,
          energySpent: LETTER_PUBLICATION_COST,
          moderatedById: null,
          moderatedAt: null,
          moderationNote: null,
          publishedAt: null,
        },
      });
    } else {
      publication = await prisma.letterPublication.create({
        data: {
          draftId: draft.id,
          userId: session.user.id,
          status: LetterPublicationStatus.PENDING,
          isAnonymous: payload.anonymous,
          excerpt,
          runeId: draft.runeId,
          energySpent: LETTER_PUBLICATION_COST,
        },
      });
    }

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.LETTER_PUBLISHED,
      metadata: {
        publicationId: publication.id,
        draftId: draft.id,
        rune: draft.runeId,
        anonymous: payload.anonymous,
        republish: isRepublish,
      },
    });

    void recordConstellationEvent({
      userId: session.user.id,
      type: ConstellationEventType.LETTER_PUBLISHED,
      payload: { publicationId: publication.id, runeId: draft.runeId },
    });

    if (draft.mirrorText) {
      void recordEmotionalMemory({
        userId: session.user.id,
        sourceType: EmbeddingSourceType.LETTER_DRAFT,
        sourceId: draft.id,
        content: draft.mirrorText,
      }).catch((error) => {
        console.error('[LETTER_MEMORY]', error);
      });
    }

    return NextResponse.json({ ok: true, publicationId: publication.id });
  } catch (error) {
    console.error('[LETTER_PUBLISH]', error);
    return NextResponse.json({ message: 'Impossible de publier cette lettre.' }, { status: 500 });
  }
}
