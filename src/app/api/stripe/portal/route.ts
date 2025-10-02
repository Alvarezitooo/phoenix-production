import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!stripe || !process.env.APP_BASE_URL) {
    return NextResponse.json({ message: 'Stripe is not configured' }, { status: 501 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ message: 'Aucun client Stripe lié à ce compte.' }, { status: 404 });
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_BASE_URL}/dashboard`,
    });

    if (!portal.url) {
      throw new Error('Unable to create billing portal session');
    }

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error('[STRIPE_PORTAL]', error);
    return NextResponse.json({ message: 'Unable to create billing portal session' }, { status: 500 });
  }
}
