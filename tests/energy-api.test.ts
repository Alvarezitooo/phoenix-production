import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/energy/route';
import { getAuthSession } from '@/lib/auth';
import { getEnergyBalance, STREAK_BONUS_AMOUNT, STREAK_LENGTH_FOR_BONUS } from '@/lib/energy';

vi.mock('@/lib/auth');
vi.mock('@/lib/energy', () => {
  return {
    STREAK_BONUS_AMOUNT: 5,
    STREAK_LENGTH_FOR_BONUS: 3,
    getEnergyBalance: vi.fn(),
  };
});

const mockedGetAuthSession = vi.mocked(getAuthSession);
const mockedGetEnergyBalance = vi.mocked(getEnergyBalance);

describe('/api/energy', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockedGetAuthSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('returns energy snapshot with streak progress information', async () => {
    mockedGetAuthSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mockedGetEnergyBalance.mockResolvedValue({
      balance: 42,
      streakDays: 4,
      streakCount: 0,
      lastEnergyActionAt: new Date('2024-01-01').toISOString(),
      lastBonusAt: new Date('2024-01-02').toISOString(),
    } as any);

    const response = await GET();

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      balance: 42,
      streakDays: 4,
      bonus: {
        threshold: STREAK_LENGTH_FOR_BONUS,
        amount: STREAK_BONUS_AMOUNT,
        progressDays: 1,
        daysUntilBonus: 2,
      },
    });
  });
});
