import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('Stripe secret key non configurée (STRIPE_SECRET_KEY).');
  }

  stripeClient = new Stripe(secret, {
    apiVersion: '2024-06-20',
  });

  return stripeClient;
}

export function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
}
