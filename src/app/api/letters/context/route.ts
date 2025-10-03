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

    const [latestResumeDraft, matches, letters] = await Promise.all([
      prisma.resumeDraft.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.careerMatch.findMany({
        where: { userId },
        orderBy: { compatibilityScore: 'desc' },
        take: 5,
      }),
      prisma.letterDraft.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          feedback: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
    ]);

    const resumeContext = (() => {
      if (!latestResumeDraft?.content) return null;
      const content = latestResumeDraft.content as { resumeMarkdown?: string; input?: { summary?: string; skills?: string[] } };
      return {
        summary: content.input?.summary ?? null,
        skills: content.input?.skills ?? [],
        resumeMarkdown: content.resumeMarkdown ?? null,
      };
    })();

    return NextResponse.json({
      resume: resumeContext,
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
        description: match.description,
        assessmentId: match.assessmentId,
        }));
      })(),
      letterDrafts: letters.map((draft) => ({
        id: draft.id,
        title: draft.title,
        template: draft.template,
        tone: draft.tone,
        language: draft.language,
        updatedAt: draft.updatedAt,
        alignScore: draft.alignScore,
        feedback: draft.feedback.map((feedback) => ({
          id: feedback.id,
          section: feedback.section,
          message: feedback.message,
          createdAt: feedback.createdAt,
        })),
      })),
      preferredMatchId,
    });
  } catch (error) {
    console.error('[LETTERS_CONTEXT]', error);
    return NextResponse.json({ message: 'Unable to load letters context' }, { status: 500 });
  }
}
