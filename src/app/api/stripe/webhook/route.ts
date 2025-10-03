import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logAnalyticsEvent } from '@/lib/analytics';
import type { SubscriptionStatus, SubscriptionPlan } from '@prisma/client';

function resolveSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';
    case 'past_due':
    case 'incomplete':
    case 'incomplete_expired':
      return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
      return 'CANCELED';
    default:
      return 'INACTIVE';
  }
}

function resolvePlan(plan: string | null | undefined): SubscriptionPlan {
  return plan === 'PRO' ? 'PRO' : 'ESSENTIAL';
}

type StripeResponseWithData<T> = Stripe.Response<T> & { data: T };

type SubscriptionWithPeriods = Stripe.Subscription & {
  current_period_end?: number | null;
  current_period_start?: number | null;
};

function isStripeResponse<T>(resource: Stripe.Response<T> | T): resource is StripeResponseWithData<T> {
  return typeof resource === 'object' && resource !== null && 'data' in resource;
}

function unwrapStripeResource<T>(resource: Stripe.Response<T> | T): T {
  return isStripeResponse(resource) ? resource.data : (resource as T);
}

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
      const userId = session.metadata?.userId ?? null;
      const plan = session.metadata?.subscriptionPlan ?? null;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

      if (userId && subscriptionId) {
        const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = unwrapStripeResource(subscriptionResponse) as SubscriptionWithPeriods;
        const currentPeriodEndUnix = typeof subscription.current_period_end === 'number' ? subscription.current_period_end : null;
        const currentPeriodStartUnix = typeof subscription.current_period_start === 'number' ? subscription.current_period_start : null;

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionPlan: resolvePlan(plan),
            subscriptionStatus: resolveSubscriptionStatus(subscription.status),
            stripeCustomerId: subscription.customer?.toString() ?? session.customer?.toString() ?? null,
            stripeSubscriptionId: subscription.id,
            currentPeriodStart: currentPeriodStartUnix ? new Date(currentPeriodStartUnix * 1000) : null,
            currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : null,
          },
        });

        logAnalyticsEvent({
          userId,
          type: 'PLAN_CONVERTED',
          metadata: {
            plan: resolvePlan(plan),
            source: 'checkout.session.completed',
          },
        }).catch((error) => console.error('[STRIPE_PLAN_CONVERTED]', error));
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as SubscriptionWithPeriods;
      const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
        select: { id: true },
      });

      if (user) {
        const currentPeriodEndUnix = typeof subscription.current_period_end === 'number' ? subscription.current_period_end : null;
        const currentPeriodStartUnix = typeof subscription.current_period_start === 'number' ? subscription.current_period_start : null;

        const planMetadata =
          subscription.metadata?.subscriptionPlan ?? subscription.items.data[0]?.plan?.metadata?.subscriptionPlan ?? null;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: resolveSubscriptionStatus(subscription.status),
            ...(planMetadata ? { subscriptionPlan: resolvePlan(planMetadata) } : {}),
            currentPeriodStart: currentPeriodStartUnix ? new Date(currentPeriodStartUnix * 1000) : null,
            currentPeriodEnd: currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : null,
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
            currentPeriodEnd: typeof subscription.ended_at === 'number' ? new Date(subscription.ended_at * 1000) : null,
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
