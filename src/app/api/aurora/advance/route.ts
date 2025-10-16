import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAnalyticsEvent } from '@/lib/analytics'
import { creditEnergy } from '@/lib/energy'
import { AnalyticsEventType } from '@prisma/client'

const advanceSchema = z.object({
  sessionId: z.string(),
  toChamber: z.number().min(0).max(2),
})

const CHAMBER_ANALYTICS_MAP = {
  0: AnalyticsEventType.AURORA_VOILE_COMPLETED,
  1: AnalyticsEventType.AURORA_ATELIER_COMPLETED,
  2: AnalyticsEventType.AURORA_DIALOGUE_COMPLETED,
}

const CHAMBER_ENERGY_MAP = {
  0: 3, // Voile completed
  1: 3, // Atelier completed
  2: 5, // Dialogue completed
}

/**
 * POST /api/aurora/advance
 * Avance l'utilisateur à la chambre suivante et crédite l'énergie
 */
export async function POST(request: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId, toChamber } = advanceSchema.parse(body)

    // Vérifie que la session appartient à l'utilisateur
    const auroraSession = await prisma.auroraSession.findUnique({
      where: { id: sessionId },
    })

    if (!auroraSession || auroraSession.userId !== session.user.id) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 })
    }

    if (auroraSession.completedAt) {
      return NextResponse.json({ message: 'Session already completed' }, { status: 400 })
    }

    const currentChamber = auroraSession.currentChamber

    // Vérifie qu'on avance bien de 1 chambre (pas de saut)
    if (toChamber !== currentChamber + 1) {
      return NextResponse.json(
        { message: 'Invalid chamber progression' },
        { status: 400 },
      )
    }

    // Met à jour la chambre courante
    await prisma.auroraSession.update({
      where: { id: sessionId },
      data: {
        currentChamber: toChamber,
      },
    })

    // Crédite l'énergie pour la chambre complétée
    const energyReward = CHAMBER_ENERGY_MAP[currentChamber] || 0
    if (energyReward > 0) {
      await creditEnergy(
        session.user.id,
        energyReward,
        `aurora.chamber_${currentChamber}_completed`,
      )
    }

    // Log analytics
    const analyticsType = CHAMBER_ANALYTICS_MAP[currentChamber]
    if (analyticsType) {
      await logAnalyticsEvent({
        userId: session.user.id,
        type: analyticsType,
        metadata: {
          sessionId,
          energyEarned: energyReward,
        },
      })
    }

    return NextResponse.json({
      currentChamber: toChamber,
      energyEarned: energyReward,
    })
  } catch (error) {
    console.error('[Aurora Advance] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request', errors: error.errors },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    )
  }
}
