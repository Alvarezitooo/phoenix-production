import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { GET as getReferralLink } from '@/app/api/referrals/link/route';
import { POST as claimReferral } from '@/app/api/referrals/claim/route';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creditEnergy } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordConstellationEvent } from '@/lib/constellations';

vi.mock('@/lib/auth');
vi.mock('@/lib/energy');
vi.mock('@/lib/analytics');
vi.mock('@/lib/constellations');

const prismaMock = vi.hoisted(() => {
  const mock = {
    referralLink: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    referralEvent: {
      findFirst: vi.fn(),
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

describe('Referrals API', () => {
  beforeEach(() => {
    mockedCreditEnergy.mockResolvedValue(0 as any);
    mockedLogEvent.mockResolvedValue();
    mockedConstellation.mockResolvedValue();
    prismaMock.referralLink.findFirst.mockReset();
    prismaMock.referralLink.create.mockReset();
    prismaMock.referralLink.findUnique.mockReset();
    prismaMock.referralEvent.findFirst.mockReset();
    prismaMock.referralEvent.create.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the referral link for authenticated user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as any);
    prismaMock.referralLink.findFirst.mockResolvedValueOnce({ code: 'abc123', bonusEnergy: 5 });

    const response = await getReferralLink();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.code).toBe('abc123');
  });

  it('creates link when absent', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as any);
    prismaMock.referralLink.findFirst.mockResolvedValueOnce(null);
    prismaMock.referralLink.create.mockResolvedValueOnce({ code: 'newcode', bonusEnergy: 5 });

    const response = await getReferralLink();
    expect(response.status).toBe(200);
    expect(prismaMock.referralLink.create).toHaveBeenCalled();
  });

  it('claims referral and credits bonus', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_2' } } as any);
    prismaMock.referralLink.findUnique.mockResolvedValueOnce({ id: 'link_1', userId: 'user_1', code: 'refcode', bonusEnergy: 5 });
    prismaMock.referralEvent.findFirst.mockResolvedValueOnce(null);
    prismaMock.referralEvent.create.mockResolvedValueOnce({ id: 'evt' });

    const response = await claimReferral(
      new Request('http://localhost/api/referrals/claim', {
        method: 'POST',
        body: JSON.stringify({ code: 'refcode' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.referralEvent.create).toHaveBeenCalled();
    expect(mockedCreditEnergy).toHaveBeenCalledWith('user_1', 5, expect.anything(), expect.any(Object));
    expect(mockedLogEvent).toHaveBeenCalled();
    expect(mockedConstellation).toHaveBeenCalled();
  });
});
