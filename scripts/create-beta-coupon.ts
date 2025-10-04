import 'dotenv/config';
import { randomBytes } from 'crypto';
import type { SubscriptionPlan } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

function generateCode() {
  const segments = Array.from({ length: 3 }, () => randomBytes(3).toString('hex').toUpperCase());
  return `PHX-${segments.join('-')}`;
}

const rawCode = process.argv[2]?.trim();
const planArg = (process.argv[3]?.trim().toUpperCase() ?? 'PRO') as SubscriptionPlan;
const durationArg = Number.parseInt(process.argv[4] ?? '30', 10);
const expiresInDaysArg = process.argv[5] ? Number.parseInt(process.argv[5] as string, 10) : null;

const allowedPlans: SubscriptionPlan[] = ['DISCOVERY', 'ESSENTIAL', 'PRO'];
const plan: SubscriptionPlan = allowedPlans.includes(planArg) ? planArg : 'PRO';
const durationDays = Number.isFinite(durationArg) && durationArg > 0 ? durationArg : 30;
const code = (rawCode && rawCode.length >= 3 ? rawCode : generateCode()).toUpperCase();
const expiresAt = expiresInDaysArg && Number.isFinite(expiresInDaysArg) && expiresInDaysArg > 0
  ? new Date(Date.now() + expiresInDaysArg * 24 * 60 * 60 * 1000)
  : null;

async function main() {
  const coupon = await prisma.betaCoupon.create({
    data: {
      code,
      plan,
      durationDays,
      expiresAt,
    },
  });

  console.log('Coupon créé :');
  console.log(`  Code            : ${coupon.code}`);
  console.log(`  Plan            : ${coupon.plan}`);
  console.log(`  Durée (jours)   : ${coupon.durationDays}`);
  console.log(`  Expire le       : ${coupon.expiresAt?.toISOString() ?? 'jamais'}`);
}

main()
  .catch((error) => {
    console.error('[create-beta-coupon]', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
