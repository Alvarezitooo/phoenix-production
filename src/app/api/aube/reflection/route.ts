import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAubeReflection } from '@/lib/ai';
import { logAnalyticsEvent } from '@/lib/analytics';

const schema = z.object({
  entries: z
    .array(
      z.object({
        promptKey: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);

    let entries = data.entries;
    if (!entries || entries.length === 0) {
      const journal = await prisma.journalEntry.findMany({
        where: { userId: session.user.id, portal: 'AUBE' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { promptKey: true, content: true },
      });
      entries = journal.map((entry) => ({ promptKey: entry.promptKey, content: entry.content }));
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: 'Aucune donnée Aube disponible.' }, { status: 400 });
    }

    const reflection = await generateAubeReflection(entries);

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.AUBE_REFLECTION_REQUESTED,
      metadata: { promptCount: entries.length },
    });

    return NextResponse.json({ reflection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Payload invalide', issues: error.issues }, { status: 400 });
    }
    console.error('[AUBE_REFLECTION]', error);
    return NextResponse.json({ message: 'Impossible de générer un reflet pour le moment.' }, { status: 500 });
  }
}
