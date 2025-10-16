import { NextResponse } from 'next/server';
import { z } from 'zod';
import { EnergyPackPurchaseStatus } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppBaseUrl, getStripeClient } from '@/lib/stripe';
import { getEnergyPackById } from '@/config/energy';

const bodySchema = z.object({
  packId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  }

  let packId: string;
  try {
    const body = await request.json();
    ({ packId } = bodySchema.parse(body));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Paramètres invalides', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Requête illisible' }, { status: 400 });
  }

  const pack = getEnergyPackById(packId);
  if (!pack) {
    return NextResponse.json({ message: 'Pack énergie introuvable.' }, { status: 404 });
  }

  if (!pack.stripePriceEnvKey) {
    return NextResponse.json({ message: 'Ce pack ne peut pas être acheté pour le moment.' }, { status: 400 });
  }

  const priceId = process.env[pack.stripePriceEnvKey];
  if (!priceId) {
    return NextResponse.json({
      message: `Configuration Stripe manquante (${pack.stripePriceEnvKey}).`,
    }, { status: 500 });
  }

  try {
    const stripe = getStripeClient();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Utilisateur inconnu.' }, { status: 404 });
    }

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const mode = pack.energyAmount === 'unlimited' ? 'subscription' : 'payment';
    const baseUrl = getAppBaseUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/energy?success=1&pack=${pack.id}`,
      cancel_url: `${baseUrl}/energy?cancel=1&pack=${pack.id}`,
      metadata: {
        userId: user.id,
        packId: pack.id,
        energyAmount: pack.energyAmount === 'unlimited' ? 'unlimited' : String(pack.energyAmount),
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ message: 'Stripe ne retourne pas d’URL de session.' }, { status: 502 });
    }

    await prisma.energyPackPurchase.create({
      data: {
        userId: user.id,
        packId: pack.id,
        stripeCheckoutSessionId: checkoutSession.id,
        status: EnergyPackPurchaseStatus.PENDING,
        energyAmount: typeof pack.energyAmount === 'number' ? pack.energyAmount : null,
        energyAmountLabel: typeof pack.energyAmount === 'number' ? null : pack.energyAmount,
        amountInCents: Math.round(pack.priceEuros * 100),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[ENERGY_PACK_CHECKOUT]', error);
    return NextResponse.json({ message: 'Impossible de créer la session de paiement.' }, { status: 500 });
  }
}
