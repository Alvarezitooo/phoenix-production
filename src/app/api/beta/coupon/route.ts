import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const payloadSchema = z.object({
  code: z
    .string({ required_error: 'Le code est requis.' })
    .trim()
    .min(3, 'Le code doit contenir au moins 3 caractères.')
    .max(64, 'Le code est trop long.'),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  }

  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Code invalide.';
    return NextResponse.json({ message }, { status: 400 });
  }

  const code = parsed.data.code.trim().toUpperCase();

  try {
    const coupon = await prisma.betaCoupon.findUnique({ where: { code } });
    if (!coupon) {
      return NextResponse.json({ message: 'Ce code n’existe pas ou a déjà été utilisé.' }, { status: 404 });
    }

    const now = new Date();
    if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ message: 'Ce code a expiré.' }, { status: 410 });
    }

    if (coupon.redeemedById && coupon.redeemedById !== userId) {
      return NextResponse.json({ message: 'Ce code a déjà été utilisé par un autre compte.' }, { status: 409 });
    }

    const durationDays = coupon.durationDays ?? 30;
    const periodStart = now;
    const periodEnd = new Date(periodStart.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.betaCoupon.updateMany({
        where: {
          id: coupon.id,
          OR: [{ redeemedById: null }, { redeemedById: userId }],
        },
        data: {
          redeemedById: userId,
          redeemedAt: now,
        },
      });

      if (updated.count === 0) {
        throw new Error('COUPON_ALREADY_REDEEMED');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: coupon.plan,
          subscriptionStatus: 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      plan: coupon.plan,
      durationDays,
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'COUPON_ALREADY_REDEEMED') {
      return NextResponse.json({ message: 'Ce code vient d’être utilisé par un autre compte.' }, { status: 409 });
    }

    console.error('[BETA_COUPON]', error);
    return NextResponse.json({ message: 'Impossible d’activer le code pour le moment.' }, { status: 500 });
  }
}
