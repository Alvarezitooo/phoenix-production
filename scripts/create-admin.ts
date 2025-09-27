import 'dotenv/config';
import { hash } from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const emailArg = process.argv[2] ?? 'admin@phoenix.local';
const passwordArg = process.argv[3] ?? 'ChangeMe123!';
const planArg = (process.argv[4] ?? 'PRO').toUpperCase();

const plan: SubscriptionPlan = planArg === 'PRO' ? 'PRO' : 'ESSENTIAL';
const status: SubscriptionStatus = 'ACTIVE';

async function main() {
  const hashedPassword = await hash(passwordArg, 12);

  const user = await prisma.user.upsert({
    where: { email: emailArg.toLowerCase() },
    update: {
      name: 'Phoenix Admin',
      hashedPassword,
      subscriptionPlan: plan,
      subscriptionStatus: status,
      currentPeriodEnd: null,
    },
    create: {
      email: emailArg.toLowerCase(),
      name: 'Phoenix Admin',
      hashedPassword,
      subscriptionPlan: plan,
      subscriptionStatus: status,
    },
  });

  console.log(`Admin user ready: ${user.email} (plan ${user.subscriptionPlan})`);
}

main()
  .catch((error) => {
    console.error('[create-admin]', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
