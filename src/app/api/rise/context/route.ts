import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const preferredMatchId = session.user.preferredCareerMatchId ?? null;

    const [resumeDraft, letterDraft, riseSessions, matches] = await Promise.all([
      prisma.resumeDraft.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.letterDraft.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.riseSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.careerMatch.findMany({
        where: { userId },
        orderBy: { compatibilityScore: 'desc' },
        take: 5,
      }),
    ]);

    const resumeSummary = resumeDraft?.content
      ? ((resumeDraft.content as { input?: { summary?: string } }).input?.summary ?? null)
      : null;

    const letterSummary = letterDraft?.content
      ? ((letterDraft.content as { letterMarkdown?: string }).letterMarkdown ?? null)
      : null;

    return NextResponse.json({
      resumeSummary,
      letterSummary,
      matches: (() => {
        const seen = new Set<string>();
        const deduped = matches
          .filter((match) => {
            const key = match.careerTitle.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 10);
        const ordered = preferredMatchId
          ? [
              ...deduped.filter((match) => match.id === preferredMatchId),
              ...deduped.filter((match) => match.id !== preferredMatchId),
            ]
          : deduped;
        return ordered.slice(0, 5).map((match) => ({
        id: match.id,
        title: match.careerTitle,
        compatibilityScore: match.compatibilityScore,
        requiredSkills: match.requiredSkills,
        }));
      })(),
      sessions: riseSessions.map((session) => ({
        id: session.id,
        role: session.role,
        focus: session.focus,
        createdAt: session.createdAt,
      })),
      preferredMatchId,
    });
  } catch (error) {
    console.error('[RISE_CONTEXT]', error);
    return NextResponse.json({ message: 'Unable to load rise context' }, { status: 500 });
  }
}
