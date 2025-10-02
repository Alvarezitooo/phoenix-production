import Stripe from 'stripe';
import type { SubscriptionPlan } from '@prisma/client';
import { getStripePriceId } from '@/lib/subscription';

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2025-08-27.basil',
    })
  : null;

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  plan: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const priceId = getStripePriceId(params.plan);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: params.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId: params.userId,
      subscriptionPlan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        subscriptionPlan: params.plan,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}
