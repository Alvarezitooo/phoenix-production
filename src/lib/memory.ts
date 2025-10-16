import OpenAI from 'openai';
import { EmbeddingSourceType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const openAiKey = process.env.OPENAI_API_KEY;
let openAiClient: OpenAI | null = null;

function getOpenAiClient(): OpenAI | null {
  if (!openAiKey) return null;
  if (openAiClient) return openAiClient;
  openAiClient = new OpenAI({ apiKey: openAiKey });
  return openAiClient;
}

async function embedText(content: string) {
  const client = getOpenAiClient();
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large',
      input: content,
    });

    const vector = response.data[0]?.embedding;
    return Array.isArray(vector) ? vector : null;
  } catch (error) {
    console.error('[EMBEDDING_ERROR]', error);
    return null;
  }
}

export async function recordEmotionalMemory(params: {
  userId: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  content: string;
}) {
  const normalized = params.content.trim();
  if (!normalized) return;

  const vector = await embedText(normalized);
  const vectorString = vector ? `[${vector.join(',')}]` : null;

  const data: Parameters<typeof prisma.emotionalEmbedding.create>[0]['data'] = {
    userId: params.userId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    content: normalized,
    provider: vector ? 'openai' : null,
  };

  if (vectorString) {
    (data as Record<string, unknown>).vector = vectorString;
  }

  await prisma.emotionalEmbedding.create({ data });
}

const MEMORY_LABELS: Record<EmbeddingSourceType, string> = {
  LETTER_DRAFT: 'Lettre Luna',
  JOURNAL_ENTRY: 'Journal',
  FEEDBACK: 'Feedback',
  RISE_SESSION: 'Session Rise',
};

export async function getRecentEmotionalMemories(params: {
  userId: string;
  limit?: number;
  sourceTypes?: EmbeddingSourceType[];
}) {
  const { userId, limit = 5, sourceTypes } = params;

  const memories = await prisma.emotionalEmbedding.findMany({
    where: {
      userId,
      ...(sourceTypes ? { sourceType: { in: sourceTypes } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      sourceType: true,
      content: true,
      createdAt: true,
    },
  });

  return memories.map((memory) => {
    const label = MEMORY_LABELS[memory.sourceType] ?? memory.sourceType;
    const snippet = memory.content.length > 180 ? `${memory.content.slice(0, 177)}…` : memory.content;
    const dateLabel = memory.createdAt.toLocaleDateString('fr-FR', { dateStyle: 'medium' });
    return `${label} (${dateLabel}) : ${snippet}`;
  });
}
