import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatConstellationEvent } from '@/lib/constellations';

const FEED_SIZE = 30;

export async function GET() {
  const events = await prisma.constellationEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: FEED_SIZE,
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
    },
  });

  const letters = await prisma.letterPublication.findMany({
    where: { status: 'APPROVED', featured: true },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: {
      id: true,
      excerpt: true,
      publishedAt: true,
      runeId: true,
      isAnonymous: true,
    },
  });

  const feed = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      type: 'event' as const,
      label: formatConstellationEvent({
        type: event.type,
        payload: (event.payload as Record<string, unknown>) ?? {},
        createdAt: event.createdAt,
      }),
      rawType: event.type,
      createdAt: event.createdAt,
      payload: event.payload,
    })),
    ...letters.map((letter) => ({
      id: `letter-${letter.id}`,
      type: 'letter' as const,
      label: letter.excerpt,
      runeId: letter.runeId,
      createdAt: letter.publishedAt ?? new Date(),
      isAnonymous: letter.isAnonymous,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, FEED_SIZE);

  return NextResponse.json({ feed });
}
