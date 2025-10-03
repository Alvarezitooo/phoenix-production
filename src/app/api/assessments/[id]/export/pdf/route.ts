import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertActiveSubscription } from '@/lib/subscription';
import { buildAssessmentReportMarkdown } from '@/lib/aube/report';
import { renderMarkdownToPdf } from '@/lib/pdf';
import type { Recommendation } from '@/components/assessment/assessment-form';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  const { id: assessmentId } = await context.params;

  try {
    await assertActiveSubscription(session.user.id, { requiredPlan: 'PRO' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PLAN_UPGRADE_REQUIRED') {
        return NextResponse.json({ message: 'Le plan Pro est requis pour exporter le rapport Aube.' }, { status: 403 });
      }
      if (error.message === 'SUBSCRIPTION_REQUIRED') {
        return NextResponse.json({ message: 'Abonnement requis pour accéder au rapport.' }, { status: 402 });
      }
    }
    throw error;
  }

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

  const pdfBuffer = await renderMarkdownToPdf(markdown);
  const body = pdfBuffer instanceof Uint8Array ? Buffer.from(pdfBuffer) : pdfBuffer;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="rapport-aube.pdf"',
    },
  });
}
