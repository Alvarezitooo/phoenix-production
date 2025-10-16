import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { AnalyticsEventType, ConstellationEventType, EnergyPackPurchaseStatus, EnergyTransactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';
import { creditEnergy } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { getEnergyPackById } from '@/config/energy';
import { recordConstellationEvent } from '@/lib/constellations';

function getPaymentIntentId(paymentIntent: string | Stripe.PaymentIntent | null | undefined) {
  if (!paymentIntent) return null;
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ message: 'Missing Stripe signature header.' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ message: 'STRIPE_WEBHOOK_SECRET non configuré.' }, { status: 500 });
  }

  const stripe = getStripeClient();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[ENERGY_PACK_WEBHOOK:VERIFY]', error);
    return NextResponse.json({ message: 'Signature Stripe invalide.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata ?? {};
        const userId = metadata.userId;
        const packId = metadata.packId;

        if (!userId || !packId) {
          console.warn('[ENERGY_PACK_WEBHOOK] Session sans metadata userId/packId');
          break;
        }

        const pack = getEnergyPackById(packId);
        if (!pack) {
          console.error('[ENERGY_PACK_WEBHOOK] Pack inconnu', packId);
          break;
        }

        const purchase = await prisma.energyPackPurchase.findUnique({
          where: { stripeCheckoutSessionId: session.id },
        });

        if (purchase && purchase.status === EnergyPackPurchaseStatus.PAID) {
          return NextResponse.json({ received: true });
        }

        const paymentIntentId = getPaymentIntentId(session.payment_intent);
        const amountInCents = typeof session.amount_total === 'number' ? session.amount_total : null;

        const transactionReference = `energy-pack:${session.id}`;

        if (typeof pack.energyAmount === 'number') {
          const alreadyCredited = await prisma.energyTransaction.findFirst({
            where: {
              userId,
              reference: transactionReference,
            },
          });

          if (!alreadyCredited) {
            await creditEnergy(userId, pack.energyAmount, EnergyTransactionType.PURCHASE, {
              reason: 'energy_pack_purchase',
              packId,
              stripeSessionId: session.id,
            }, transactionReference);
          }
        }

        await prisma.energyPackPurchase.upsert({
          where: { stripeCheckoutSessionId: session.id },
          update: {
            status: EnergyPackPurchaseStatus.PAID,
            stripePaymentIntentId: paymentIntentId,
            amountInCents,
            energyAmount: typeof pack.energyAmount === 'number' ? pack.energyAmount : null,
            energyAmountLabel: typeof pack.energyAmount === 'number' ? null : pack.energyAmount,
          },
          create: {
            userId,
            packId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            status: EnergyPackPurchaseStatus.PAID,
            amountInCents,
            energyAmount: typeof pack.energyAmount === 'number' ? pack.energyAmount : null,
            energyAmountLabel: typeof pack.energyAmount === 'number' ? null : pack.energyAmount,
          },
        });

       await logAnalyticsEvent({
         userId,
         type: AnalyticsEventType.PACK_PURCHASED,
         metadata: {
           packId,
           amountInCents,
           stripeSessionId: session.id,
           energyAmount: typeof pack.energyAmount === 'number' ? pack.energyAmount : pack.energyAmount,
         },
       });

        void recordConstellationEvent({
          userId,
          type: ConstellationEventType.PACK_PURCHASED,
          payload: {
            packId,
            amountInCents,
          },
        });

        break;
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await prisma.energyPackPurchase.updateMany({
          where: {
            stripeCheckoutSessionId: session.id,
            status: {
              not: EnergyPackPurchaseStatus.PAID,
            },
          },
          data: {
            status: EnergyPackPurchaseStatus.FAILED,
          },
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[ENERGY_PACK_WEBHOOK:HANDLE]', error);
    return NextResponse.json({ message: 'Erreur lors du traitement du webhook.' }, { status: 500 });
  }
}
