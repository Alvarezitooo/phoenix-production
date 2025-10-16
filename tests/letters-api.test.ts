import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { POST } from '@/app/api/letters/publish/route';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { spendEnergy, EnergyError } from '@/lib/energy';
import { logAnalyticsEvent } from '@/lib/analytics';
import { recordEmotionalMemory } from '@/lib/memory';
import { recordConstellationEvent } from '@/lib/constellations';
import { AnalyticsEventType, LetterPublicationStatus, EmbeddingSourceType } from '@prisma/client';

// On mock les dépendances externes, mais PAS prisma
vi.mock('@/lib/auth');
vi.mock('@/lib/energy', async () => {
  const actual = await vi.importActual<typeof import('@/lib/energy')>('@/lib/energy');
  return {
    ...actual,
    spendEnergy: vi.fn(),
  };
});
vi.mock('@/lib/analytics');
vi.mock('@/lib/memory');
vi.mock('@/lib/constellations');

const mockUser = { id: 'user-123', name: 'Test User', email: 'test@example.com' };
const mockDraft = {
  id: 'draft-abc',
  userId: 'user-123',
  mirrorText: 'Ceci est un miroir de test.',
  runeId: 'clarity',
};

const mockedConstellation = vi.mocked(recordConstellationEvent);

describe('/api/letters/publish', () => {
  beforeEach(() => {
    vi.mocked(recordEmotionalMemory).mockResolvedValue();
    mockedConstellation.mockResolvedValue();
  });

  afterEach(() => {
    // Restaure tous les spies et mocks après chaque test
    vi.restoreAllMocks();
  });

  it('should return 401 Unauthorized if user is not authenticated', async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const request = new Request('http://localhost/api/letters/publish', { method: 'POST', body: JSON.stringify({ draftId: 'draft-abc' }) });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 404 Not Found if draft does not exist or does not belong to user', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: mockUser, expires: '' });
    // On espionne et mock la méthode findFirst pour ce test uniquement
    const findFirstSpy = vi.spyOn(prisma.letterDraft, 'findFirst').mockResolvedValue(null);
    const request = new Request('http://localhost/api/letters/publish', { method: 'POST', body: JSON.stringify({ draftId: 'draft-xyz' }) });

    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(findFirstSpy).toHaveBeenCalledWith({ where: { id: 'draft-xyz', userId: mockUser.id } });
  });

  it('should return 402 Payment Required if user has insufficient energy', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: mockUser, expires: '' });
    vi.spyOn(prisma.letterDraft, 'findFirst').mockResolvedValue(mockDraft as any);
    vi.spyOn(prisma.letterPublication, 'findUnique').mockResolvedValue(null);
    // On s'assure que spendEnergy rejette une VRAIE instance de EnergyError
    vi.mocked(spendEnergy).mockRejectedValue(new EnergyError('INSUFFICIENT_ENERGY', 'Solde insuffisant'));
    const request = new Request('http://localhost/api/letters/publish', { method: 'POST', body: JSON.stringify({ draftId: 'draft-abc' }) });

    const response = await POST(request);

    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.message).toBe('Énergie insuffisante pour publier la lettre.');
  });

  it('should successfully publish a letter in the nominal case', async () => {
    // Arrange
    vi.mocked(getAuthSession).mockResolvedValue({ user: mockUser, expires: '' });
    vi.mocked(spendEnergy).mockResolvedValue({ balance: 98, bonusAwarded: 0, streakDays: 1 });
    
    const findFirstSpy = vi.spyOn(prisma.letterDraft, 'findFirst').mockResolvedValue(mockDraft as any);
    const findUniqueSpy = vi.spyOn(prisma.letterPublication, 'findUnique').mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.letterPublication, 'create').mockResolvedValue({ id: 'pub-xyz' } as any);

    const excerpt =
      'Un extrait de test suffisamment long pour respecter la validation des 40 caractères et refléter le miroir Luna.';
    const request = new Request('http://localhost/api/letters/publish', {
      method: 'POST',
      body: JSON.stringify({ draftId: 'draft-abc', excerpt, anonymous: true }),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.publicationId).toBe('pub-xyz');

    // Verify spies
    expect(findFirstSpy).toHaveBeenCalledWith({ where: { id: 'draft-abc', userId: mockUser.id } });
    expect(findUniqueSpy).toHaveBeenCalledWith({ where: { draftId: mockDraft.id } });
    expect(spendEnergy).toHaveBeenCalledWith(mockUser.id, 'letters.publish', expect.any(Object));
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        draftId: mockDraft.id,
        userId: mockUser.id,
        status: LetterPublicationStatus.PENDING, // L'enum est maintenant disponible
        isAnonymous: true,
        excerpt,
        runeId: mockDraft.runeId,
        energySpent: 2, // Assuming LETTER_PUBLICATION_COST is 2
      },
    });
    expect(logAnalyticsEvent).toHaveBeenCalledWith({
      userId: mockUser.id,
      type: AnalyticsEventType.LETTER_PUBLISHED, // L'enum est maintenant disponible
      metadata: expect.objectContaining({ publicationId: 'pub-xyz', republish: false }),
    });
    expect(recordEmotionalMemory).toHaveBeenCalledWith({
      userId: mockUser.id,
      sourceType: EmbeddingSourceType.LETTER_DRAFT,
      sourceId: mockDraft.id,
      content: mockDraft.mirrorText,
    });
  });

  it('should allow republishing a rejected letter', async () => {
    vi.mocked(getAuthSession).mockResolvedValue({ user: mockUser, expires: '' });
    vi.mocked(spendEnergy).mockResolvedValue({ balance: 80, bonusAwarded: 0, streakDays: 4 });

    vi.spyOn(prisma.letterDraft, 'findFirst').mockResolvedValue({ ...mockDraft } as any);
    vi.spyOn(prisma.letterPublication, 'findUnique').mockResolvedValue({
      id: 'pub-xyz',
      status: LetterPublicationStatus.REJECTED,
    } as any);
    const updateSpy = vi.spyOn(prisma.letterPublication, 'update').mockResolvedValue({ id: 'pub-xyz' } as any);

    const response = await POST(
      new Request('http://localhost/api/letters/publish', {
        method: 'POST',
        body: JSON.stringify({ draftId: mockDraft.id }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'pub-xyz' },
      data: expect.objectContaining({ status: LetterPublicationStatus.PENDING }),
    });
    expect(logAnalyticsEvent).toHaveBeenCalledWith({
      userId: mockUser.id,
      type: AnalyticsEventType.LETTER_PUBLISHED,
      metadata: expect.objectContaining({ publicationId: 'pub-xyz', republish: true }),
    });
  });
});
