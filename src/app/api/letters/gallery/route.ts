import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { LETTER_RUNES } from '@/config/letters';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(24).default(12),
  rune: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parseResult = querySchema.safeParse({
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    rune: url.searchParams.get('rune') ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ message: 'Paramètres invalides', issues: parseResult.error.issues }, { status: 400 });
  }

  const { page, pageSize, rune } = parseResult.data;
  const skip = (page - 1) * pageSize;

  const runeFilter = rune && LETTER_RUNES.some((item) => item.id === rune) ? rune : undefined;

  const [items, total] = await Promise.all([
    prisma.letterPublication.findMany({
      where: {
        status: 'APPROVED',
        runeId: runeFilter ?? undefined,
      },
      select: {
        id: true,
        draftId: true,
        runeId: true,
        excerpt: true,
        publishedAt: true,
        isAnonymous: true,
        likesCount: true,
        flagsCount: true,
        draft: {
          select: {
            mirrorText: true,
            mirrorKeywords: true,
            mirrorEmotions: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.letterPublication.count({
      where: {
        status: 'APPROVED',
        runeId: runeFilter ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      runeId: item.runeId,
      excerpt: item.excerpt,
      publishedAt: item.publishedAt,
      isAnonymous: item.isAnonymous,
      likes: item.likesCount,
      flags: item.flagsCount,
      mirrorKeywords: item.draft?.mirrorKeywords ?? [],
      mirrorEmotions: item.draft?.mirrorEmotions ?? [],
    })),
    pagination: {
      page,
      pageSize,
      total,
    },
  });
}
