import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function hashCacheKey(parts: Record<string, unknown>) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(parts, Object.keys(parts).sort()))
    .digest('hex');
}

export async function getCachedResponse<T = unknown>(cacheKey: string) {
  const record = await prisma.aiCache.findUnique({ where: { cacheKey } });
  if (!record) return null;
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    await prisma.aiCache.delete({ where: { cacheKey } });
    return null;
  }
  return record.response as T;
}

export async function setCachedResponse<T = unknown>(
  cacheKey: string,
  response: T,
  ttlSeconds?: number,
) {
  const jsonResponse = response as Prisma.InputJsonValue;
  return prisma.aiCache.upsert({
    where: { cacheKey },
    update: {
      response: jsonResponse,
      expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null,
    },
    create: {
      cacheKey,
      response: jsonResponse,
      expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null,
    },
  });
}
