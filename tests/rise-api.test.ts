import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSession } from '@/lib/auth';
import { GET as getRiseContext } from '@/app/api/rise/context/route';
import { POST as postRiseQuestions } from '@/app/api/rise/questions/route';
import { GET as getRiseSession, PATCH as patchRiseSession } from '@/app/api/rise/sessions/[id]/route';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInterviewPracticeSet } from '@/lib/ai';
import { spendEnergy } from '@/lib/energy';

vi.mock('@/lib/auth', () => ({
  getAuthSession: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  getInterviewPracticeSet: vi.fn(),
}));

vi.mock('@/lib/energy', () => ({
  spendEnergy: vi.fn().mockResolvedValue({ balance: 80, bonusAwarded: 0, streakDays: 2 }),
}));

type PrismaMock = {
  resumeDraft: { findFirst: ReturnType<typeof vi.fn> };
  letterDraft: { findFirst: ReturnType<typeof vi.fn> };
  riseSession: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  careerMatch: { findMany: ReturnType<typeof vi.fn> };
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn().mockImplementation(async (fn) => fn(prisma)), // Mock de $transaction
    resumeDraft: { findFirst: vi.fn() },
    letterDraft: { findFirst: vi.fn() },
    riseSession: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    careerMatch: { findMany: vi.fn() },
  },
}));

const mockedAuth = vi.mocked(getAuthSession);
const mockedInterviewSet = vi.mocked(getInterviewPracticeSet);
const mockedSpendEnergy = vi.mocked(spendEnergy);
const prismaClient = () => prisma as unknown as PrismaMock;

describe('Rise API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const client = prismaClient();
    client.resumeDraft.findFirst.mockReset();
    client.letterDraft.findFirst.mockReset();
    client.riseSession.findMany.mockReset();
    client.riseSession.create.mockReset();
    client.riseSession.findFirst.mockReset();
    client.riseSession.update.mockReset();
    client.careerMatch.findMany.mockReset();
  });

  describe('GET /api/rise/context', () => {
    it('refuse l’accès si la session est absente', async () => {
      mockedAuth.mockResolvedValueOnce(null);

      const response = await getRiseContext();

      expect(response.status).toBe(401);
    });

    it('agrège le contexte Rise pour un utilisateur authentifié', async () => {
      mockedAuth.mockResolvedValueOnce({ user: { id: 'user_1' } } as AppSession);
      prismaClient().resumeDraft.findFirst.mockResolvedValueOnce({
        content: { input: { summary: 'Résumé CV' } },
      });
      prismaClient().letterDraft.findFirst.mockResolvedValueOnce({
        content: { letterMarkdown: 'Lettre récente' },
      });
      prismaClient().riseSession.findMany.mockResolvedValueOnce([
        { id: 'session_1', role: 'Head of Product', focus: 'behavioral', createdAt: new Date('2024-01-01') },
      ]);
      prismaClient().careerMatch.findMany.mockResolvedValueOnce([
        {
          id: 'match_1',
          careerTitle: 'Product Lead',
          compatibilityScore: 92,
          requiredSkills: ['Leadership', 'Strategy'],
        },
      ]);

      const response = await getRiseContext();
      expect(response.status).toBe(200);

      const payload = (await response.json()) as Record<string, unknown>;

      expect(payload).toMatchObject({
        resumeSummary: 'Résumé CV',
        letterSummary: 'Lettre récente',
        matches: [
          {
            id: 'match_1',
            title: 'Product Lead',
            compatibilityScore: 92,
            requiredSkills: ['Leadership', 'Strategy'],
          },
        ],
        sessions: [
          {
            id: 'session_1',
            role: 'Head of Product',
            focus: 'behavioral',
          },
        ],
      });
    });
  });

  describe('POST /api/rise/questions', () => {
    it('refuse la génération sans session valide', async () => {
      mockedAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/rise/questions', {
        method: 'POST',
        body: JSON.stringify({ role: 'Head of Product', focus: 'behavioral' }),
      });

      const response = await postRiseQuestions(request);

      expect(response.status).toBe(401);
    });

    it('génère et persiste un atelier Rise', async () => {
      mockedAuth.mockResolvedValueOnce({ user: { id: 'user_1' } } as AppSession);
      mockedInterviewSet.mockResolvedValueOnce([
        {
          question: 'Présentez un projet clé',
          competency: 'Leadership',
          guidance: 'Structurez votre réponse avec la méthode STAR.',
        },
      ]);
      prismaClient().riseSession.create.mockResolvedValueOnce({ id: 'session_123' });

      const request = new Request('http://localhost/api/rise/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Head of Product', focus: 'technical' }),
      });

      const response = await postRiseQuestions(request);

      expect(response.status).toBe(200);
      const payload = (await response.json()) as Record<string, unknown>;

      expect(mockedSpendEnergy).toHaveBeenCalledWith('user_1', 'rise.generate', expect.any(Object));
      expect(mockedInterviewSet).toHaveBeenCalledWith({ role: 'Head of Product', focus: 'technical' }, { userId: 'user_1' });
      expect(prismaClient().riseSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_1',
          role: 'Head of Product',
          focus: 'technical',
          questions: [
            {
              question: 'Présentez un projet clé',
              competency: 'Leadership',
              guidance: 'Structurez votre réponse avec la méthode STAR.',
            },
          ],
        },
      });
      expect(payload).toMatchObject({
        sessionId: 'session_123',
        questions: [
          {
            question: 'Présentez un projet clé',
            competency: 'Leadership',
          },
        ],
      });
    });
  });

  describe('Sessions Rise', () => {
    it('charge une session existante', async () => {
      mockedAuth.mockResolvedValueOnce({ user: { id: 'user_1' } } as AppSession);
      prismaClient().riseSession.findFirst.mockResolvedValueOnce({
        id: 'session_1',
        userId: 'user_1',
        role: 'Product Lead',
        focus: 'strategic',
        questions: [
          {
            question: 'Décrivez une décision stratégique',
            competency: 'Vision',
            guidance: 'Exposez le contexte et les arbitrages.',
          },
        ],
        notes: [
          {
            question: 'Décrivez une décision stratégique',
            answer: 'J’ai redéfini la roadmap.',
            takeaway: 'Mettre en avant les résultats.',
          },
        ],
        createdAt: new Date('2024-01-02'),
      });

      const response = await getRiseSession(new Request('http://localhost/api/rise/sessions/session_1', { method: 'GET' }), {
        params: { id: 'session_1' },
      });

      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        session: {
          id: string;
          role: string;
          focus: string;
          questions: Array<{ question: string; competency: string; guidance: string }>;
          notes: Array<{ question: string; answer?: string | null; takeaway?: string | null }>;
        };
      };

      expect(payload.session).toMatchObject({
        id: 'session_1',
        role: 'Product Lead',
        focus: 'strategic',
      });
      expect(payload.session.notes).toHaveLength(1);
    });

    it('met à jour les notes de session', async () => {
      mockedAuth.mockResolvedValueOnce({ user: { id: 'user_1' } } as AppSession);
      prismaClient().riseSession.findFirst.mockResolvedValueOnce({ id: 'session_1', userId: 'user_1', notes: [] });
      prismaClient().riseSession.update.mockResolvedValueOnce({ id: 'session_1' });

      const request = new Request('http://localhost/api/rise/sessions/session_1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: [
            {
              question: 'Présentez un échec',
              answer: 'Manque de préparation',
              takeaway: 'Préparer davantage les stakeholders',
            },
          ],
        }),
      });

      const response = await patchRiseSession(request, { params: { id: 'session_1' } });

      expect(response.status).toBe(200);
      expect(prismaClient().riseSession.update).toHaveBeenCalledWith({
        where: { id: 'session_1' },
        data: {
          notes: [
            {
              question: 'Présentez un échec',
              answer: 'Manque de préparation',
              takeaway: 'Préparer davantage les stakeholders',
            },
          ],
        },
      });
    });
  });
});
