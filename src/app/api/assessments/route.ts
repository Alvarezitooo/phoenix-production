import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AnalyticsEventType, AssessmentMode, AssessmentStatus } from '@prisma/client';
import { getCareerRecommendations, analyzeAssessmentResults, type CareerRecommendation } from '@/lib/ai';
import { logAnalyticsEvent } from '@/lib/analytics';
import { sendAssessmentCompletedEmail } from '@/lib/mailer';
import { EnergyError, spendEnergy } from '@/lib/energy';

const bigFiveSchema = z.record(z.number().min(1).max(5)).refine((scores) => Object.keys(scores).length === 5, {
  message: 'Big Five must include exactly five traits',
});

const riasecSchema = z.record(z.number().min(1).max(5)).refine((scores) => Object.keys(scores).length === 6, {
  message: 'RIASEC must include six categories',
});

const sharedResponsesSchema = z.object({
  bigFive: bigFiveSchema,
  riasec: riasecSchema,
  workPreferences: z.array(z.string()).min(1),
  strengths: z.array(z.string()).min(1),
  growthAreas: z.array(z.string()).optional().default([]),
  interests: z.array(z.string()).optional().default([]),
  narrative: z.string().optional(),
  keyMoments: z.string().optional(),
  roleVision: z.string().optional(),
  nonNegotiables: z.string().optional(),
  energyBoosters: z.string().optional(),
  energyDrainers: z.string().optional(),
});

const quickAssessmentSchema = z.object({
  mode: z.literal(AssessmentMode.QUICK),
  responses: sharedResponsesSchema,
});

const completeAssessmentSchema = z.object({
  mode: z.literal(AssessmentMode.COMPLETE),
  responses: sharedResponsesSchema.extend({
    growthAreas: z.array(z.string()).min(1),
    interests: z.array(z.string()).min(1),
    narrative: z.string().min(80, 'Décrivez votre ambition pour enrichir le rapport complet'),
    keyMoments: z.string().min(80, 'Décrivez au moins une expérience significative'),
    roleVision: z.string().min(60, 'Précisez votre trajectoire cible'),
  }),
});

const createSchema = z.discriminatedUnion('mode', [quickAssessmentSchema, completeAssessmentSchema]);

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const assessments = await prisma.assessment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      careerMatches: true,
    },
  });

  const formatted = assessments.map((assessment) => {
    const results = (assessment.results ?? {}) as { summary?: string; recommendations?: CareerRecommendation[] };
    return {
      ...assessment,
      results,
    };
  });

  return NextResponse.json({ assessments: formatted });
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = createSchema.parse(await request.json());

    const actionKey = parsed.mode === 'COMPLETE' ? 'assessment.complete' : 'assessment.quick';
    try {
      await spendEnergy(session.user.id, actionKey, { metadata: { mode: parsed.mode } });
    } catch (error) {
      if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
        return NextResponse.json({ message: 'Énergie insuffisante pour lancer cette évaluation.' }, { status: 402 });
      }
      throw error;
    }

    const assessment = await prisma.assessment.create({
      data: {
        userId: session.user.id,
        mode: parsed.mode,
        status: AssessmentStatus.PROCESSING,
        responses: parsed.responses,
      },
    });

    logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.ASSESSMENT_STARTED,
      metadata: { assessmentId: assessment.id, mode: parsed.mode },
    }).catch((error) => console.error('Failed to log analytics event', error));

    const recommendationPayload = {
      mode: parsed.mode,
      bigFive: parsed.responses.bigFive,
      riasec: parsed.responses.riasec,
      workPreferences: parsed.responses.workPreferences,
      strengths: parsed.responses.strengths,
      growthAreas: parsed.responses.growthAreas,
      interests: parsed.responses.interests,
      narrative: parsed.responses.narrative,
      keyMoments: parsed.responses.keyMoments,
      roleVision: parsed.responses.roleVision,
      nonNegotiables: parsed.responses.nonNegotiables,
      energyBoosters: parsed.responses.energyBoosters,
      energyDrainers: parsed.responses.energyDrainers,
    };

    try {
      const [recommendations, summary] = await Promise.all([
        getCareerRecommendations(recommendationPayload),
        analyzeAssessmentResults(recommendationPayload),
      ]);

      const userId = session.user?.id;
      const userEmail = session.user?.email ?? '';

      if (!userId) {
        throw new Error('USER_MISSING');
      }

      const recommendationsWithIds = await prisma.$transaction(async (tx) => {
        const created = await Promise.all(
          recommendations.map((recommendation: CareerRecommendation) =>
            tx.careerMatch.create({
              data: {
                userId,
                assessmentId: assessment.id,
                careerTitle: recommendation.careerTitle,
                compatibilityScore: recommendation.compatibilityScore,
                sector: recommendation.sector,
                description: recommendation.description,
                requiredSkills: recommendation.requiredSkills,
                salaryRange: recommendation.salaryRange,
                details: recommendation,
              },
            }),
          ),
        );

        const enriched = created.map((createdMatch, index) => ({
          ...recommendations[index],
          id: createdMatch.id,
        }));

        await tx.assessment.update({
          where: { id: assessment.id },
          data: {
            status: AssessmentStatus.COMPLETED,
            completionDate: new Date(),
            results: {
              summary,
              recommendations: enriched,
            },
          },
        });

        return enriched;
      });

      sendAssessmentCompletedEmail(
        userEmail,
        parsed.mode === 'QUICK' ? 'Quick Analysis' : 'Complete Assessment',
      ).catch((error) => console.error('Unable to send assessment email', error));

      logAnalyticsEvent({
        userId,
        type: AnalyticsEventType.ASSESSMENT_COMPLETED,
        metadata: { assessmentId: assessment.id, mode: parsed.mode },
      }).catch((error) => console.error('Failed to log analytics event', error));

      return NextResponse.json({
        assessmentId: assessment.id,
        recommendations: recommendationsWithIds,
        summary,
      });
    } catch (error) {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          status: AssessmentStatus.FAILED,
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('[ASSESSMENT_CREATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }

    if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
      return NextResponse.json({ message: 'Énergie insuffisante pour lancer cette évaluation.' }, { status: 402 });
    }

    return NextResponse.json({ message: 'Failed to process assessment' }, { status: 500 });
  }
}
