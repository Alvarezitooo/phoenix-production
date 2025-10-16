import { prisma } from '@/lib/prisma';

type DashboardMatch = {
  id: string;
  title: string;
  compatibilityScore: number;
  requiredSkills: string[];
  description: string | null;
};

type DashboardLetter = {
  id: string;
  title: string | null;
  alignScore: number | null;
  updatedAt: string;
  excerpt: string | null;
};

type DashboardRiseSession = {
  id: string;
  role: string;
  focus: string;
  createdAt: string;
  notesCount: number;
};

type DashboardAssessment = {
  id: string;
  mode: string;
  status: string;
  createdAt: string;
};

type DashboardConversation = {
  id: string;
  title: string | null;
  updatedAt: string;
  messagesCount: number;
};

type DashboardUserInfo = {
  name: string | null;
  energyBalance: number;
  streakDays: number;
  lastEnergyActionAt: string | null;
  lastBonusAt: string | null;
  preferredCareerMatchId: string | null;
};

export type DashboardSnapshot = {
  user: DashboardUserInfo | null;
  resumeSummary: string | null;
  letterPreview: string | null;
  matches: DashboardMatch[];
  letters: DashboardLetter[];
  riseSessions: DashboardRiseSession[];
  assessments: DashboardAssessment[];
  conversations: DashboardConversation[];
  auroraCompleted: boolean;
  errors: string[];
};

function dedupeMatches(matches: { id: string; careerTitle: string; compatibilityScore: number; requiredSkills: string[]; description: string | null }[]) {
  const seen = new Set<string>();
  const ordered: typeof matches = [];
  for (const match of matches) {
    const key = match.careerTitle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(match);
  }
  return ordered;
}

function extractResumeSummary(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null;
  const payload = content as { input?: { summary?: unknown } };
  const summary = payload.input?.summary;
  return typeof summary === 'string' ? summary : null;
}

function extractLetterMarkdown(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null;
  const payload = content as { letterMarkdown?: unknown };
  const markdown = payload.letterMarkdown;
  return typeof markdown === 'string' ? markdown : null;
}

export async function getDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const errors: string[] = [];

  async function guard<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      console.error(`[DASHBOARD:${label}]`, error);
      errors.push(`${label}`);
      return null;
    }
  }

  const [user, wallet, resumeDraft, letterDrafts, matches, riseSessions, assessments, conversations, auroraSession] = await Promise.all([
    guard('user', () =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          preferredCareerMatchId: true,
        },
      }),
    ),
    guard('energy', () =>
      prisma.energyWallet.findUnique({
        where: { userId },
        select: {
          balance: true,
          currentStreakDays: true,
          lastEnergyActionAt: true,
          lastBonusAwardedAt: true,
        },
      }),
    ),
    guard('resumeDraft', () =>
      prisma.resumeDraft.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          content: true,
        },
      }),
    ),
    guard('letterDrafts', () =>
      prisma.letterDraft.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          alignScore: true,
          content: true,
          updatedAt: true,
        },
      }),
    ),
    guard('matches', () =>
      prisma.careerMatch.findMany({
        where: { userId },
        orderBy: { compatibilityScore: 'desc' },
        take: 10,
        select: {
          id: true,
          careerTitle: true,
          compatibilityScore: true,
          requiredSkills: true,
          description: true,
        },
      }),
    ),
    guard('riseSessions', () =>
      prisma.riseSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          role: true,
          focus: true,
          createdAt: true,
          notes: true,
        },
      }),
    ),
    guard('assessments', () =>
      prisma.assessment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          mode: true,
          status: true,
          createdAt: true,
        },
      }),
    ),
    guard('conversations', () =>
      prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          messages: true,
        },
      }),
    ),
    guard('auroraSession', () =>
      prisma.auroraSession.findFirst({
        where: {
          userId,
          completedAt: { not: null },
        },
        select: {
          id: true,
          completedAt: true,
        },
      }),
    ),
  ]);

  const resumeSummary = resumeDraft ? extractResumeSummary(resumeDraft.content) : null;

  const userInfo: DashboardUserInfo | null = user
    ? {
        name: user.name,
        energyBalance: wallet?.balance ?? 0,
        streakDays: wallet?.currentStreakDays ?? 0,
        lastEnergyActionAt: wallet?.lastEnergyActionAt?.toISOString() ?? null,
        lastBonusAt: wallet?.lastBonusAwardedAt?.toISOString() ?? null,
        preferredCareerMatchId: user.preferredCareerMatchId ?? null,
      }
    : null;

  const preferredMatchId = user?.preferredCareerMatchId ?? null;

  const dedupedMatches = dedupeMatches(matches ?? []);
  const orderedMatches = preferredMatchId
    ? [
        ...dedupedMatches.filter((match) => match.id === preferredMatchId),
        ...dedupedMatches.filter((match) => match.id !== preferredMatchId),
      ]
    : dedupedMatches;

  const letters: DashboardLetter[] = (letterDrafts ?? []).map((draft) => {
    const markdown = extractLetterMarkdown(draft.content);
    return {
      id: draft.id,
      title: draft.title ?? null,
      alignScore: draft.alignScore ?? null,
      updatedAt: draft.updatedAt.toISOString(),
      excerpt: markdown ? markdown.slice(0, 500) : null,
    };
  });

  const letterPreview = letters.length > 0 ? letters[0].excerpt : null;

  const riseSessionsMapped: DashboardRiseSession[] = (riseSessions ?? []).map((session) => ({
    id: session.id,
    role: session.role,
    focus: session.focus,
    createdAt: session.createdAt.toISOString(),
    notesCount: Array.isArray(session.notes) ? session.notes.length : 0,
  }));

  const assessmentsMapped: DashboardAssessment[] = (assessments ?? []).map((assessment) => ({
    id: assessment.id,
    mode: assessment.mode,
    status: assessment.status,
    createdAt: assessment.createdAt.toISOString(),
  }));

  const conversationsMapped: DashboardConversation[] = (conversations ?? []).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messagesCount: Array.isArray(conversation.messages) ? conversation.messages.length : 0,
  }));

  const matchesMapped: DashboardMatch[] = orderedMatches.slice(0, 3).map((match) => ({
    id: match.id,
    title: match.careerTitle,
    compatibilityScore: match.compatibilityScore,
    requiredSkills: match.requiredSkills,
    description: match.description ?? null,
  }));

  return {
    user: userInfo,
    resumeSummary,
    letterPreview,
    matches: matchesMapped,
    letters,
    riseSessions: riseSessionsMapped,
    assessments: assessmentsMapped,
    conversations: conversationsMapped,
    auroraCompleted: Boolean(auroraSession),
    errors,
  };
}
