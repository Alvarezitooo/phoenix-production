import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { spendEnergy } from '@/lib/energy';
import { buildAssessmentReportMarkdown } from '@/lib/aube/report';
import type { Recommendation } from '@/components/assessment/assessment-form';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  const { id: assessmentId } = await context.params;

  await spendEnergy(session.user.id, 'assessment.quick', {
    costOverride: 0,
    metadata: { module: 'assessment-export', format: 'markdown', assessmentId },
  });

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, userId: session.user.id },
    include: { careerMatches: true },
  });

  if (!assessment) {
    return NextResponse.json({ message: 'Analyse introuvable.' }, { status: 404 });
  }

  const results = (assessment.results ?? {}) as { summary?: string; recommendations?: unknown };
  let recommendations: Recommendation[] = [];
  if (Array.isArray(results.recommendations)) {
    recommendations = results.recommendations as Recommendation[];
  } else if (assessment.careerMatches.length) {
    recommendations = assessment.careerMatches.map((match) => ({
      careerTitle: match.careerTitle,
      compatibilityScore: match.compatibilityScore,
      sector: match.sector ?? '',
      description: match.description ?? '',
      requiredSkills: match.requiredSkills ?? [],
      salaryRange: match.salaryRange ?? '',
      quickWins: undefined,
      developmentFocus: undefined,
    }));
  }

  const markdown = buildAssessmentReportMarkdown({
    summary: results.summary ?? null,
    recommendations,
    responses: assessment.responses as Record<string, unknown>,
    completedAt: assessment.completionDate ?? assessment.createdAt,
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rapport-aube.md"',
    },
  });
}
