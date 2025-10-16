import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateInterviewCoachResponse } from '@/lib/ai';
import { logAnalyticsEvent } from '@/lib/analytics';
import { EnergyError, spendEnergy } from '@/lib/energy';

const schema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  focusArea: z.string().default('general'),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());

    try {
      await spendEnergy(session.user.id, 'luna.chat', {
        metadata: { focusArea: body.focusArea, conversationId: body.conversationId },
      });
    } catch (error) {
      if (error instanceof EnergyError && error.code === 'INSUFFICIENT_ENERGY') {
        return NextResponse.json({ message: 'Énergie insuffisante pour continuer la conversation avec Luna.' }, { status: 402 });
      }
      throw error;
    }

    const conversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: { id: body.conversationId, userId: session.user.id },
        })
      : await prisma.conversation.create({
          data: {
            userId: session.user.id,
            title: 'Luna Assistant',
            messages: [],
          },
        });

    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 });
    }

    const history = Array.isArray(conversation.messages)
      ? (conversation.messages as Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>)
      : [];

    const nextUserMessage = { role: 'user' as const, content: body.message, timestamp: new Date().toISOString() };
    const newHistory = [...history.slice(-40), nextUserMessage];

    const aiMessage = await generateInterviewCoachResponse(
      newHistory.map(({ role, content }) => ({ role, content })),
      body.focusArea,
      { userId: session.user.id },
    );

    const nextAssistantMessage = {
      role: 'assistant' as const,
      content: aiMessage,
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [...newHistory.slice(-39), nextAssistantMessage];

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messages: updatedHistory,
        updatedAt: new Date(),
      },
    });

    logAnalyticsEvent({
      userId: session.user.id,
      type: 'CHAT_MESSAGE',
      metadata: { conversationId: conversation.id },
    }).catch((error) => console.error('Failed to log analytics', error));

    return NextResponse.json({
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error('[LUNA_CHAT]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to process message' }, { status: 500 });
  }
}
