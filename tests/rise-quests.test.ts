import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/rise/quests/route';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creditEnergy } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordConstellationEvent } from '@/lib/constellations';
import { AnalyticsEventType, ConstellationEventType, EnergyTransactionType } from '@prisma/client';

vi.mock('@/lib/auth');
vi.mock('@/lib/energy');
vi.mock('@/lib/analytics');
vi.mock('@/lib/constellations');

const prismaMock = vi.hoisted(() => {
  const mock = {
    riseQuestProgress: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    userBadge: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;

  mock.$transaction.mockImplementation(async (fn: any) => fn(mock));
  return mock;
});

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

const mockedAuth = vi.mocked(getAuthSession);
const mockedCreditEnergy = vi.mocked(creditEnergy);
const mockedLogEvent = vi.mocked(logAnalyticsEvent);
const mockedConstellation = vi.mocked(recordConstellationEvent);

describe('/api/rise/quests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockedCreditEnergy.mockResolvedValue(0 as any);
    mockedLogEvent.mockResolvedValue();
    prismaMock.riseQuestProgress.findMany.mockReset();
    prismaMock.riseQuestProgress.findUnique.mockReset();
    prismaMock.riseQuestProgress.create.mockReset();
    prismaMock.riseQuestProgress.count.mockReset();
    prismaMock.userBadge.findUnique.mockReset();
    prismaMock.userBadge.create.mockReset();
    mockedConstellation.mockResolvedValue();
  });

  it('returns 401 when not authenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('returns quests with progress and badge info', async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: 'user_1' } } as any);
    prismaMock.riseQuestProgress.findMany.mockResolvedValueOnce([
      { questId: 'alignement_intentions', completedAt: new Date('2024-01-01'), energyAwarded: 2 },
    ]);
    prismaMock.userBadge.findUnique.mockResolvedValueOnce(null);

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.quests).toBeInstanceOf(Array);
    expect(payload.badge).toMatchObject({ earned: false, progress: 1 });
  });

  it('completes a quest, awards energy, and logs analytics', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as any);
    prismaMock.riseQuestProgress.findUnique.mockResolvedValueOnce(null);
    prismaMock.riseQuestProgress.count.mockResolvedValueOnce(4);
    prismaMock.userBadge.findUnique.mockResolvedValueOnce(null);

    const request = new Request('http://localhost/api/rise/quests', {
      method: 'POST',
      body: JSON.stringify({ questId: 'alignement_intentions' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(prismaMock.riseQuestProgress.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ questId: 'alignement_intentions', userId: 'user_1' }),
    });
    expect(mockedCreditEnergy).toHaveBeenCalledWith('user_1', expect.any(Number), EnergyTransactionType.BONUS, expect.any(Object));
    expect(mockedLogEvent).toHaveBeenCalledWith({
      userId: 'user_1',
      type: AnalyticsEventType.RISE_QUEST_COMPLETED,
      metadata: expect.objectContaining({ questId: 'alignement_intentions' }),
    });
    expect(mockedConstellation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        type: ConstellationEventType.RISE_QUEST_COMPLETED,
      }),
    );
  });
});
