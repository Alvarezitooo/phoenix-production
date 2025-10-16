import { ConstellationEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function recordConstellationEvent(params: {
  userId: string;
  type: ConstellationEventType;
  payload?: Record<string, unknown>;
}) {
  try {
    await prisma.constellationEvent.create({
      data: {
        userId: params.userId,
        type: params.type,
        payload: params.payload,
      },
    });
  } catch (error) {
    console.error('[CONSTELLATION_EVENT]', error);
  }
}

export function formatConstellationEvent(event: {
  type: ConstellationEventType;
  payload: Record<string, unknown> | null;
  createdAt: Date;
}) {
  const dateLabel = event.createdAt.toLocaleDateString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  switch (event.type) {
    case ConstellationEventType.PORTAL_AUBE_COMPLETED:
      return `${dateLabel} · Rituel Aube complété`;
    case ConstellationEventType.LETTER_PUBLISHED:
      return `${dateLabel} · Lettre publiée dans la constellation`;
    case ConstellationEventType.RISE_BADGE_AWARDED:
      return `${dateLabel} · Badge Rise débloqué`;
    case ConstellationEventType.PACK_PURCHASED:
      return `${dateLabel} · Pack énergie acquis`;
    case ConstellationEventType.REFERRAL_BONUS:
      return `${dateLabel} · Bonus parrainage distribué`;
    case ConstellationEventType.RISE_VICTORY_LOGGED:
      return `${dateLabel} · Victoire Rise partagée`;
    default:
      return `${dateLabel} · Évènement Luna`;
  }
}
