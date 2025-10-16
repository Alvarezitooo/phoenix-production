import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAuroraReport, EMOTIONAL_PROFILES } from '@/lib/aurora'
import { logAnalyticsEvent } from '@/lib/analytics'
import { creditEnergy } from '@/lib/energy'
import { AnalyticsEventType } from '@prisma/client'

const completeSchema = z.object({
  sessionId: z.string(),
})

/**
 * POST /api/aurora/complete
 * Finalise la session Aurora et génère le bilan personnalisé
 */
export async function POST(request: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId } = completeSchema.parse(body)

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

    // Récupère les insights
    const insights = auroraSession.insights as any || {}

    // Détecte le profil émotionnel final
    const emotionalProfileId =
      insights.voile?.emotionalProfile || 'en_questionnement'

    const profile = Object.values(EMOTIONAL_PROFILES).find(
      (p) => p.id === emotionalProfileId,
    )

    // Génère le bilan
    const report = generateAuroraReport({
      emotionalProfile: emotionalProfileId,
      insights: {
        voile: insights.voile || {},
        atelier: insights.atelier || { questionsAsked: 0 },
        dialogue: insights.dialogue || { promptImprovement: false },
      },
    })

    // Met à jour la session
    await prisma.auroraSession.update({
      where: { id: sessionId },
      data: {
        emotionalProfile: profile?.label || 'En progression',
        completedAt: new Date(),
      },
    })

    // Crédite l'énergie (11 points total)
    await creditEnergy(session.user.id, 11, 'aurora.journey_completed')

    // Log analytics
    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.AURORA_COMPLETED,
      metadata: {
        sessionId,
        emotionalProfile: profile?.label,
        energyEarned: 11,
      },
    })

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.AURORA_PROFILE_GENERATED,
      metadata: {
        profile: profile?.label,
        badge: profile?.badge,
      },
    })

    return NextResponse.json({
      report,
      emotionalProfile: profile?.label,
      badge: profile?.badge,
    })
  } catch (error) {
    console.error('[Aurora Complete] Error:', error)

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
