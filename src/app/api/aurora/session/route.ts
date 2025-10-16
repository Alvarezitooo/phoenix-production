import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAnalyticsEvent } from '@/lib/analytics'
import { AnalyticsEventType } from '@prisma/client'

/**
 * GET /api/aurora/session
 * Récupère la session Aurora active de l'utilisateur
 */
export async function GET() {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // Cherche une session non complétée
  const auroraSession = await prisma.auroraSession.findFirst({
    where: {
      userId: session.user.id,
      completedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ session: auroraSession })
}

/**
 * POST /api/aurora/session
 * Crée une nouvelle session Aurora ou récupère la session en cours
 */
export async function POST() {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // Vérifie s'il existe déjà une session non complétée
  let auroraSession = await prisma.auroraSession.findFirst({
    where: {
      userId: session.user.id,
      completedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Si aucune session active, en créer une nouvelle
  if (!auroraSession) {
    auroraSession = await prisma.auroraSession.create({
      data: {
        userId: session.user.id,
        currentChamber: 0,
        dialogue: [],
      },
    })

    // Log analytics
    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.AURORA_STARTED,
      metadata: { sessionId: auroraSession.id },
    })
  }

  return NextResponse.json({ session: auroraSession })
}
