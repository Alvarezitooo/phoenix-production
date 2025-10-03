import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { logAnalyticsEvent } from '@/lib/analytics';

const schema = z.object({
  type: z.nativeEnum(AnalyticsEventType),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    await logAnalyticsEvent({
      userId: session.user.id,
      type: data.type,
      metadata: data.metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Payload invalide', issues: error.issues }, { status: 400 });
    }
    console.error('[ANALYTICS_EVENT]', error);
    return NextResponse.json({ message: 'Impossible d’enregistrer l’événement' }, { status: 500 });
  }
}
