import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAuroraReport, EMOTIONAL_PROFILES } from '@/lib/aurora'

export async function GET(request: Request) {
  const session = await getAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sessionIdParam = url.searchParams.get('sessionId')

  const auroraSession = sessionIdParam
    ? await prisma.auroraSession.findUnique({
        where: { id: sessionIdParam },
      })
    : await prisma.auroraSession.findFirst({
        where: {
          userId: session.user.id,
          completedAt: { not: null },
        },
        orderBy: { completedAt: 'desc' },
      })

  if (!auroraSession || auroraSession.userId !== session.user.id) {
    return NextResponse.json({ message: 'Session not found' }, { status: 404 })
  }

  if (!auroraSession.completedAt) {
    return NextResponse.json({ message: 'Session not completed' }, { status: 400 })
  }

  const insights = (auroraSession.insights as any) ?? {}
  const emotionalProfileId = insights.voile?.emotionalProfile ?? 'en_questionnement'
  const profile = Object.values(EMOTIONAL_PROFILES).find((item) => item.id === emotionalProfileId)

  const report = generateAuroraReport({
    emotionalProfile: emotionalProfileId,
    insights: {
      voile: insights.voile ?? {},
      atelier: insights.atelier ?? { questionsAsked: 0 },
      dialogue: insights.dialogue ?? { promptImprovement: false },
    },
  })

  return NextResponse.json({
    report,
    emotionalProfile: profile?.label,
    badge: profile?.badge,
  })
}
