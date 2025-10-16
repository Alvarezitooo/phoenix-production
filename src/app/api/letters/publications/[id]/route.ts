import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, LetterPublicationStatus } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isStaffSession } from '@/lib/staff';
import { logAnalyticsEvent } from '@/lib/analytics';

const paramsSchema = z.object({
  id: z.string().uuid({ message: 'Identifiant de publication invalide.' }),
});

const updateSchema = z.object({
  status: z.nativeEnum(LetterPublicationStatus),
  note: z.string().trim().min(1).max(500).optional(),
});

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  if (!isStaffSession(session)) {
    return NextResponse.json({ message: "Accès réservé à l'équipe." }, { status: 403 });
  }

  const params = await context.params;
  const parseParams = paramsSchema.safeParse(params ?? {});
  if (!parseParams.success) {
    return NextResponse.json({ message: 'Identifiant invalide' }, { status: 400 });
  }

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Paramètres invalides', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Requête illisible' }, { status: 400 });
  }

  const publication = await prisma.letterPublication.findUnique({
    where: { id: parseParams.data.id },
    select: {
      id: true,
      userId: true,
      status: true,
      publishedAt: true,
    },
  });

  if (!publication) {
    return NextResponse.json({ message: 'Publication introuvable.' }, { status: 404 });
  }

  const now = new Date();
  const nextPublishedAt =
    payload.status === LetterPublicationStatus.APPROVED ? publication.publishedAt ?? now : null;

  try {
    const updated = await prisma.letterPublication.update({
      where: { id: publication.id },
      data: {
        status: payload.status,
        moderationNote: payload.note ?? null,
        moderatedById: session?.user?.id ?? null,
        moderatedAt: now,
        publishedAt: nextPublishedAt,
      },
      select: {
        id: true,
        status: true,
        moderatedAt: true,
        moderatedById: true,
        moderationNote: true,
        publishedAt: true,
      },
    });

    await logAnalyticsEvent({
      userId: publication.userId,
      type: AnalyticsEventType.LETTER_MODERATION_UPDATED,
      metadata: {
        publicationId: updated.id,
        status: updated.status,
        moderatedById: updated.moderatedById,
      },
    });

    return NextResponse.json({
      ok: true,
      publication: updated,
    });
  } catch (error) {
    console.error('[LETTER_PUBLICATION_MODERATION]', error);
    return NextResponse.json({ message: 'Impossible de mettre à jour la publication.' }, { status: 500 });
  }
}
