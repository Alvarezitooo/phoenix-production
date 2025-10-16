import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppBaseUrl } from '@/lib/stripe';

function generateReferralCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.referralLink.findFirst({ where: { userId: session.user.id } });

  const link = existing
    ? existing
    : await prisma.referralLink.create({
        data: {
          userId: session.user.id,
          code: generateReferralCode(),
        },
      });

  const baseUrl = getAppBaseUrl();
  const shareUrl = `${baseUrl}/auth/register?ref=${link.code}`;

  return NextResponse.json({
    code: link.code,
    shareUrl,
    bonusEnergy: link.bonusEnergy,
  });
}
