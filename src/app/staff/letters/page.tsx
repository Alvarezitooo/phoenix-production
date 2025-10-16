import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { isStaffSession } from '@/lib/staff';
import { StaffLetterModerationTable } from '@/components/letters/staff-letter-moderation';

export const metadata: Metadata = {
  title: 'Modération Letters | Phoenix Ops',
};

export const dynamic = 'force-dynamic';

export default async function StaffLettersModerationPage() {
  const session = await getAuthSession();
  if (!isStaffSession(session)) {
    redirect('/');
  }

  const publications = await prisma.letterPublication.findMany({
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      draft: {
        select: {
          title: true,
          mirrorText: true,
          mirrorKeywords: true,
          mirrorEmotions: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 80,
  });

  const initialPublications = publications.map((publication) => ({
    id: publication.id,
    status: publication.status,
    isAnonymous: publication.isAnonymous,
    excerpt: publication.excerpt,
    runeId: publication.runeId,
    createdAt: publication.createdAt.toISOString(),
    updatedAt: publication.updatedAt.toISOString(),
    publishedAt: publication.publishedAt?.toISOString() ?? null,
    moderatedAt: publication.moderatedAt?.toISOString() ?? null,
    moderationNote: publication.moderationNote ?? null,
    energySpent: publication.energySpent,
    user: {
      id: publication.user.id,
      name: publication.user.name,
      email: publication.user.email,
    },
    draft: {
      title: publication.draft.title,
      mirrorText: publication.draft.mirrorText,
      mirrorKeywords: publication.draft.mirrorKeywords,
      mirrorEmotions: publication.draft.mirrorEmotions,
    },
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-12">
      <StaffLetterModerationTable initialPublications={initialPublications} />
    </main>
  );
}
