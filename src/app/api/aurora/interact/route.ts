import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAuroraResponse, detectEmotionalProfile } from '@/lib/aurora'
import { logAnalyticsEvent } from '@/lib/analytics'
import { AnalyticsEventType } from '@prisma/client'

const interactSchema = z.object({
  sessionId: z.string(),
  userMessage: z.string().min(1),
  chamber: z.enum(['voile', 'atelier', 'dialogue']),
  context: z.record(z.any()).optional(), // Contexte spécifique à la chambre (firstWord, face, etc.)
})

/**
 * POST /api/aurora/interact
 * Envoie un message utilisateur et reçoit la réponse IA d'Aurora
 */
export async function POST(request: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId, userMessage, chamber, context } = interactSchema.parse(body)

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

    // Récupère l'historique de conversation
    const dialogue = (auroraSession.dialogue as Array<{ role: string; content: string }>) || []

    // Génère la réponse IA
    const aiResponse = await generateAuroraResponse({
      chamber,
      userMessage,
      conversationHistory: dialogue,
    })

    // Met à jour le dialogue
    const updatedDialogue = [
      ...dialogue,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'aurora', content: aiResponse, timestamp: new Date().toISOString() },
    ]

    // Met à jour la session
    const updatedInsights = { ...(auroraSession.insights as object || {}) }

    // Si c'est la chambre Voile et qu'on a le contexte, on stocke les insights
    if (chamber === 'voile' && context) {
      updatedInsights.voile = {
        ...(updatedInsights.voile || {}),
        ...context,
      }

      // Détecte le profil émotionnel si on a assez d'infos
      if (context.firstWord && context.face) {
        const emotionalProfile = detectEmotionalProfile(context.firstWord, context.face)
        updatedInsights.voile = {
          ...updatedInsights.voile,
          emotionalProfile,
        }
      }
    }

    // Si c'est l'Atelier ou le Dialogue, on stocke aussi les insights
    if (chamber === 'atelier' && context) {
      updatedInsights.atelier = {
        ...(updatedInsights.atelier || {}),
        ...context,
      }
    }

    if (chamber === 'dialogue' && context) {
      updatedInsights.dialogue = {
        ...(updatedInsights.dialogue || {}),
        ...context,
      }
    }

    await prisma.auroraSession.update({
      where: { id: sessionId },
      data: {
        dialogue: updatedDialogue,
        insights: updatedInsights,
      },
    })

    return NextResponse.json({
      aiResponse,
      shouldAdvance: false, // À gérer côté client selon la logique de progression
    })
  } catch (error) {
    console.error('[Aurora Interact] Error:', error)

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
