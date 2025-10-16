import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType, ConstellationEventType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { spendEnergy, EnergyError } from '@/lib/energy';
import { buildAubeProfile } from '@/lib/aube/profile';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordConstellationEvent } from '@/lib/constellations';

const portalSchema = z.object({
  entries: z
    .array(
      z.object({
        promptKey: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [profile, journal] = await Promise.all([
    prisma.aubeProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.journalEntry.findMany({
      where: { userId: session.user.id, portal: 'AUBE' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, promptKey: true, content: true, createdAt: true },
    }),
  ]);

  await logAnalyticsEvent({
    userId: session.user.id,
    type: AnalyticsEventType.AUBE_PORTAL_VIEWED,
    metadata: { hasProfile: Boolean(profile) },
  });

  return NextResponse.json({ profile, journal });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = portalSchema.parse(await request.json());

    try {
      await spendEnergy(session.user.id, 'aube.reveal', { metadata: { source: 'aube_portal' } });
    } catch (error) {
      if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
        return NextResponse.json({ message: 'Énergie insuffisante pour ouvrir Aube.' }, { status: 402 });
      }
      throw error;
    }

    const profileSummary = buildAubeProfile(payload.entries);

    const result = await prisma.$transaction(async (tx) => {
      await tx.journalEntry.deleteMany({ where: { userId: session.user.id, portal: 'AUBE' } });
      await tx.journalEntry.createMany({
        data: payload.entries.map((entry) => ({
          userId: session.user.id,
          portal: 'AUBE',
          promptKey: entry.promptKey,
          content: entry.content,
        })),
      });

      const profile = await tx.aubeProfile.upsert({
        where: { userId: session.user.id },
        update: {
          forces: profileSummary.forces,
          shadow: profileSummary.shadow,
          element: profileSummary.element,
          clarityNote: profileSummary.clarityNote,
        },
        create: {
          userId: session.user.id,
          forces: profileSummary.forces,
          shadow: profileSummary.shadow,
          element: profileSummary.element,
          clarityNote: profileSummary.clarityNote,
        },
      });

      return profile;
    });

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.AUBE_PORTAL_COMPLETED,
      metadata: {
        element: result.element,
        forces: result.forces,
      },
    });

    void recordConstellationEvent({
      userId: session.user.id,
      type: ConstellationEventType.PORTAL_AUBE_COMPLETED,
      payload: { element: result.element },
    });

    return NextResponse.json({ profile: result });
  } catch (error) {
    console.error('[AUBE_PROFILE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
      return NextResponse.json({ message: 'Énergie insuffisante pour ouvrir Aube.' }, { status: 402 });
    }
    return NextResponse.json({ message: 'Unable to générer le profil Aube' }, { status: 500 });
  }
}
