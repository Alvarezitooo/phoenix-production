import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/rise/victories/route';
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
    riseVictory: {
      findMany: vi.fn(),
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

describe('/api/rise/victories', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockedCreditEnergy.mockResolvedValue(0 as any);
    mockedLogEvent.mockResolvedValue();
    prismaMock.riseVictory.findMany.mockReset();
    prismaMock.riseVictory.create.mockReset();
    mockedConstellation.mockResolvedValue();
  });

  it('returns 401 if unauthenticated', async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('lists recent victories', async () => {
    mockedAuth.mockResolvedValueOnce({ user: { id: 'user_1' } } as any);
    prismaMock.riseVictory.findMany.mockResolvedValueOnce([
      { id: 'vict_1', note: 'Victoire', energyDeclared: 2, createdAt: new Date('2024-01-01') },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.victories).toHaveLength(1);
  });

  it('enregistre une victoire et crédite énergie', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as any);

    const request = new Request('http://localhost/api/rise/victories', {
      method: 'POST',
      body: JSON.stringify({ note: 'Belle progression aujourd’hui', energyDeclared: 3 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(prismaMock.riseVictory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user_1', note: 'Belle progression aujourd’hui', energyDeclared: 3 }),
    });
    expect(mockedCreditEnergy).toHaveBeenCalledWith('user_1', 3, EnergyTransactionType.BONUS, expect.any(Object));
    expect(mockedLogEvent).toHaveBeenCalledWith({
      userId: 'user_1',
      type: AnalyticsEventType.RISE_VICTORY_LOGGED,
      metadata: expect.objectContaining({ energyDeclared: 3 }),
    });
    expect(mockedConstellation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        type: ConstellationEventType.RISE_VICTORY_LOGGED,
      }),
    );
  });
});
