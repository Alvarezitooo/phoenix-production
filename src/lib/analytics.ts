import { AnalyticsEventType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function logAnalyticsEvent(params: {
  userId?: string;
  type: AnalyticsEventType;
  metadata?: Record<string, unknown>;
}) {
  await prisma.analyticsEvent.create({
    data: {
      userId: params.userId,
      type: params.type,
      metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}
