import { NextResponse } from 'next/server';
import { AssessmentMode, AssessmentStatus, ConversationChannel } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type AssessmentResponses = {
  strengths?: string[];
  workPreferences?: string[];
  growthAreas?: string[];
  interests?: string[];
  narrative?: string;
};

type AssessmentResults = {
  summary?: string;
  recommendations?: Array<{ careerTitle: string; compatibilityScore?: number; sector?: string }>;
};

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [latestComplete, latestQuick, matches, drafts, conversations] = await Promise.all([
      prisma.assessment.findFirst({
        where: {
          userId,
          mode: AssessmentMode.COMPLETE,
          status: AssessmentStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assessment.findFirst({
        where: {
          userId,
          mode: AssessmentMode.QUICK,
          status: AssessmentStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.careerMatch.findMany({
        where: { userId },
        orderBy: { compatibilityScore: 'desc' },
        take: 5,
      }),
      prisma.resumeDraft.findMany({
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
      prisma.conversation.findMany({
        where: {
          userId,
          channel: ConversationChannel.LUNA,
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
    ]);

    const anchorAssessment = latestComplete ?? latestQuick;
    let assessmentContext: Record<string, unknown> | null = null;

    if (anchorAssessment) {
      const responses = (anchorAssessment.responses ?? {}) as AssessmentResponses;
      const results = (anchorAssessment.results ?? {}) as AssessmentResults;
      assessmentContext = {
        id: anchorAssessment.id,
        mode: anchorAssessment.mode,
        createdAt: anchorAssessment.createdAt,
        summary: results.summary ?? null,
        recommendations: (results.recommendations ?? []).slice(0, 3),
        strengths: responses.strengths ?? [],
        workPreferences: responses.workPreferences ?? [],
        growthAreas: responses.growthAreas ?? [],
        interests: responses.interests ?? [],
        narrative: responses.narrative ?? null,
      };
    }

    const preferredMatchId = session.user?.preferredCareerMatchId ?? null;
    const seenTitles = new Set<string>();
    const deduped = matches
      .filter((match) => {
        const key = match.careerTitle.toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      })
      .slice(0, 10);
    const orderedMatches = preferredMatchId
      ? [
          ...deduped.filter((match) => match.id === preferredMatchId),
          ...deduped.filter((match) => match.id !== preferredMatchId),
        ]
      : deduped;

    const careerMatches = orderedMatches.map((match) => ({
      id: match.id,
      title: match.careerTitle,
      compatibilityScore: match.compatibilityScore,
      description: match.description,
      requiredSkills: match.requiredSkills,
      salaryRange: match.salaryRange,
      assessmentId: match.assessmentId,
    }));

    const resumeDrafts = drafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      template: draft.template,
      tone: draft.tone,
      language: draft.language,
      version: draft.version,
      alignScore: draft.alignScore,
      updatedAt: draft.updatedAt,
      feedback: draft.feedback.map((item) => ({
        id: item.id,
        section: item.section,
        message: item.message,
        createdAt: item.createdAt,
      })),
    }));

    const lunaThreads = conversations.map((conversation) => {
      const rawMessages = conversation.messages;
      const messages = Array.isArray(rawMessages) ? rawMessages : [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        lastMessage: lastMessage && typeof lastMessage === 'object' ? lastMessage : null,
      };
    });

    return NextResponse.json({
      assessment: assessmentContext,
      careerMatches,
      resumeDrafts,
      lunaThreads,
      preferredMatchId,
    });
  } catch (error) {
    console.error('[CV_CONTEXT]', error);
    return NextResponse.json({ message: 'Unable to retrieve CV context' }, { status: 500 });
  }
}
