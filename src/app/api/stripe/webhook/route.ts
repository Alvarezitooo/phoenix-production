import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ message: 'Stripe not configured' }, { status: 501 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
  }

  const body = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.subscriptionPlan as Stripe.Metadata[keyof Stripe.Metadata] | undefined;
      const subscriptionId = session.subscription as string | undefined;
      if (userId && plan && subscriptionId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionPlan: plan === 'PRO' ? 'PRO' : 'ESSENTIAL',
            subscriptionStatus: 'ACTIVE',
            stripeCustomerId: session.customer?.toString() ?? null,
            stripeSubscriptionId: subscriptionId,
            currentPeriodEnd: session.expires_at ? new Date(session.expires_at * 1000) : null,
          },
        });
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
        select: { id: true },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          },
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
        select: { id: true },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'CANCELED',
            currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[STRIPE_WEBHOOK]', error);
    return new NextResponse('Invalid signature', { status: 400 });
  }
}
