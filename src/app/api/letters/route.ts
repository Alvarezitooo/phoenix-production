import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { generateCoverLetter } from '@/lib/ai';
import { assertActiveSubscription } from '@/lib/subscription';

const schema = z.object({
  jobTitle: z.string().min(2),
  company: z.string().min(2),
  tone: z.enum(['professional', 'friendly', 'impactful']).default('professional'),
  highlights: z.array(z.string().min(5)).min(2),
  resumeSummary: z.string().min(20),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    await assertActiveSubscription(session.user.id);

    const content = await generateCoverLetter(payload);
    return NextResponse.json({ content });
  } catch (error) {
    console.error('[LETTER_GENERATE]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ message: 'Abonnement requis pour générer une lettre.' }, { status: 402 });
    }
    return NextResponse.json({ message: 'Unable to generate letter' }, { status: 500 });
  }
}
