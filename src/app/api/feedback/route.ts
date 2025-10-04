import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const feedbackSchema = z.object({
  module: z.string().trim().min(2, 'Module requis.'),
  category: z.string().trim().max(32).optional(),
  message: z.string().trim().min(10, 'Merci de détailler votre retour (10 caractères minimum).').max(2000),
  context: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Payload invalide.';
    return NextResponse.json({ message }, { status: 400 });
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        module: parsed.data.module,
        category: parsed.data.category?.toUpperCase(),
        message: parsed.data.message,
        context: parsed.data.context ? (parsed.data.context as Prisma.InputJsonValue) : undefined,
      },
    });

    return NextResponse.json({ ok: true, id: feedback.id });
  } catch (error) {
    console.error('[FEEDBACK_CREATE]', error);
    return NextResponse.json({ message: 'Impossible d’enregistrer votre retour.' }, { status: 500 });
  }
}
