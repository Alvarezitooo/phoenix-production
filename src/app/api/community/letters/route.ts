import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(24).default(12),
  rune: z.string().optional(),
  featuredOnly: z.coerce.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parse = schema.safeParse({
    page: url.searchParams.get('page'),
    pageSize: url.searchParams.get('pageSize'),
    rune: url.searchParams.get('rune') ?? undefined,
    featuredOnly: url.searchParams.get('featuredOnly') ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json({ message: 'Paramètres invalides', issues: parse.error.issues }, { status: 400 });
  }

  const { page, pageSize, rune, featuredOnly } = parse.data;
  const skip = (page - 1) * pageSize;

  const where = {
    status: 'APPROVED' as const,
    ...(featuredOnly ? { featured: true } : {}),
    ...(rune ? { runeId: rune } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.letterPublication.findMany({
      where,
      select: {
        id: true,
        runeId: true,
        excerpt: true,
        publishedAt: true,
        isAnonymous: true,
        likesCount: true,
        draft: {
          select: {
            mirrorKeywords: true,
            mirrorEmotions: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.letterPublication.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      runeId: item.runeId,
      excerpt: item.excerpt,
      publishedAt: item.publishedAt,
      isAnonymous: item.isAnonymous,
      likes: item.likesCount,
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
