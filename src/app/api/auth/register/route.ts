import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

const DEFAULT_PLAN = (process.env.DEFAULT_SUBSCRIPTION_PLAN ?? 'DISCOVERY') as 'DISCOVERY' | 'ESSENTIAL' | 'PRO';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(['DISCOVERY', 'ESSENTIAL', 'PRO']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hash(data.password, 12);
    const selectedPlan = (data.plan as typeof DEFAULT_PLAN | undefined) ?? DEFAULT_PLAN;
    const isDiscovery = selectedPlan === 'DISCOVERY';
    const periodStart = new Date();
    const periodEnd = isDiscovery ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        hashedPassword,
        subscriptionPlan: selectedPlan,
        subscriptionStatus: isDiscovery ? 'ACTIVE' : 'INACTIVE',
        currentPeriodStart: isDiscovery ? periodStart : null,
        currentPeriodEnd: isDiscovery ? periodEnd : null,
      },
    });

    return NextResponse.json({ message: 'Account created successfully' });
  } catch (error) {
    console.error('[REGISTER]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to create account' }, { status: 500 });
  }
}
