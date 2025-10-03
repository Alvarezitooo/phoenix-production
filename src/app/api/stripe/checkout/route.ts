import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import type { SubscriptionPlan } from '@prisma/client';

const schema = z.object({
  plan: z.enum(['ESSENTIAL', 'PRO']),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ message: 'Stripe is not configured' }, { status: 501 });
  }

  try {
    const body = schema.parse(await request.json());
    const plan = body.plan as SubscriptionPlan;
    if (plan === 'DISCOVERY') {
      return NextResponse.json({ message: 'Le plan Découverte ne nécessite pas de paiement.' }, { status: 400 });
    }
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });
    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      email: session.user.email,
      plan,
      successUrl: `${process.env.APP_BASE_URL}/dashboard?checkout=success`,
      cancelUrl: `${process.env.APP_BASE_URL}/dashboard?checkout=cancelled`,
      customerId: userRecord?.stripeCustomerId ?? null,
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to create checkout session' }, { status: 500 });
  }
}
