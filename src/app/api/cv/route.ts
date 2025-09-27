import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { generateResume } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { assertActiveSubscription } from '@/lib/subscription';

const contextSchema = z
  .object({
    strengths: z.array(z.string().min(1)).optional(),
    workPreferences: z.array(z.string().min(1)).optional(),
    growthAreas: z.array(z.string().min(1)).optional(),
    interests: z.array(z.string().min(1)).optional(),
    narrative: z.string().optional(),
    quickWins: z.array(z.string().min(3)).optional(),
    developmentFocus: z.array(z.string().min(3)).optional(),
    selectedMatch: z
      .object({
        title: z.string().min(1),
        compatibilityScore: z.number().min(0).max(100).optional(),
        requiredSkills: z.array(z.string().min(2)).optional(),
        salaryRange: z.string().optional(),
      })
      .nullable()
      .optional(),
    modules: z
      .object({
        cvBuilder: z.boolean().optional(),
        letters: z.boolean().optional(),
        rise: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

const schema = z.object({
  targetRole: z.string().min(2),
  template: z.enum(['modern', 'minimal', 'executive']).default('modern'),
  summary: z.string().min(20),
  experiences: z
    .array(
      z.object({
        company: z.string().min(1),
        role: z.string().min(1),
        achievements: z.array(z.string().min(5)).min(1),
      }),
    )
    .min(1),
  skills: z.array(z.string().min(2)).min(3),
  tone: z.enum(['impact', 'leadership', 'international', 'default']).optional().default('impact'),
  language: z.enum(['fr', 'en']).optional().default('fr'),
  context: contextSchema,
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    await assertActiveSubscription(session.user.id);

    const result = await generateResume({
      targetRole: payload.targetRole,
      template: payload.template,
      summary: payload.summary,
      experiences: payload.experiences,
      skills: payload.skills,
      tone: payload.tone,
      language: payload.language,
      context: payload.context,
    });

    const draft = await prisma.resumeDraft.create({
      data: {
        userId: session.user.id,
        title: payload.targetRole,
        template: payload.template,
        tone: payload.tone,
        language: payload.language,
        content: {
          input: payload,
          resumeMarkdown: result.resumeMarkdown,
          atsChecklist: result.atsChecklist,
          nextActions: result.nextActions,
        },
        alignScore: result.alignScore ?? null,
      },
    });

    return NextResponse.json({
      resume: result.resumeMarkdown,
      insights: {
        atsChecklist: result.atsChecklist,
        alignScore: result.alignScore ?? null,
        nextActions: result.nextActions,
      },
      draftId: draft.id,
    });
  } catch (error) {
    console.error('[CV_GENERATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ message: 'Abonnement requis pour générer un CV.' }, { status: 402 });
    }
    return NextResponse.json({ message: 'Unable to generate resume' }, { status: 500 });
  }
}
