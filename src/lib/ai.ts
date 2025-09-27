import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import type { AssessmentMode } from '@prisma/client';
import { getCachedResponse, hashCacheKey, setCachedResponse } from '@/lib/cache';

const openAiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GOOGLE_GENERATIVE_API_KEY;

const openai = openAiKey
  ? new OpenAI({ apiKey: openAiKey })
  : null;

const gemini = geminiKey
  ? new GoogleGenerativeAI(geminiKey)
  : null;

type Provider = 'openai' | 'gemini';

type CareerRecommendation = {
  careerTitle: string;
  compatibilityScore: number;
  sector: string;
  description: string;
  requiredSkills: string[];
  salaryRange: string;
  quickWins?: string[];
  developmentFocus?: string[];
};

type InterviewQuestion = {
  question: string;
  competency: string;
  guidance: string;
};

type AssessmentPayload = {
  mode: AssessmentMode;
  bigFive: Record<string, number>;
  riasec: Record<string, number>;
  workPreferences: string[];
  strengths: string[];
  growthAreas?: string[];
  interests?: string[];
  narrative?: string;
};

type ResumeContext = {
  strengths?: string[];
  workPreferences?: string[];
  growthAreas?: string[];
  interests?: string[];
  narrative?: string | null;
  quickWins?: string[];
  developmentFocus?: string[];
  selectedMatch?: {
    title: string;
    compatibilityScore?: number;
    requiredSkills?: string[];
    salaryRange?: string;
  } | null;
  modules?: {
    cvBuilder?: boolean;
    letters?: boolean;
    rise?: boolean;
  };
};

type ResumeGenerationPayload = {
  targetRole: string;
  template: 'modern' | 'minimal' | 'executive';
  summary: string;
  experiences: Array<{ company: string; role: string; achievements: string[] }>;
  skills: string[];
  tone?: 'impact' | 'leadership' | 'international' | 'default';
  language?: 'fr' | 'en';
  context?: ResumeContext;
};

type ResumeGenerationResult = {
  resumeMarkdown: string;
  atsChecklist: string[];
  alignScore?: number;
  nextActions: string[];
};

const FALLBACK_RECOMMENDATIONS: CareerRecommendation[] = [
  {
    careerTitle: 'Product Manager',
    compatibilityScore: 86,
    sector: 'Technology',
    description:
      'Lead cross-functional teams to build digital products that solve real customer problems with data-informed decisions.',
    requiredSkills: ['Leadership', 'Strategic Thinking', 'Data Analysis', 'Communication'],
    salaryRange: '$95k – $140k',
    quickWins: ['Cartographier vos KPIs prioritaires', 'Rencontrer 3 utilisateurs pour confirmer les besoins'],
    developmentFocus: ['Renforcer la gouvernance produit', 'Structurer la prise de décision data-driven'],
  },
  {
    careerTitle: 'UX Researcher',
    compatibilityScore: 82,
    sector: 'Design',
    description: 'Design empathetic user experiences by conducting qualitative and quantitative research activities.',
    requiredSkills: ['User Interviews', 'Research Synthesis', 'Prototyping', 'Storytelling'],
    salaryRange: '$80k – $120k',
    quickWins: ["Planifier un diary study express", "Mettre à jour la librairie d'insights"],
    developmentFocus: ['Approfondir les méthodes quantitatives', 'Formaliser la restitution aux stakeholders'],
  },
  {
    careerTitle: 'People & Culture Lead',
    compatibilityScore: 78,
    sector: 'Human Resources',
    description: 'Build inclusive work environments focused on coaching, employee engagement, and talent development.',
    requiredSkills: ['Coaching', 'Conflict Resolution', 'Policy Design', 'Analytics'],
    salaryRange: '$85k – $110k',
    quickWins: ['Lancer un feedback pulse', 'Structurer un plan de coaching managers'],
    developmentFocus: ['Industrialiser les rituels people', "Déployer une stratégie d'analytics RH"],
  },
];

async function callProvider(prompt: string, provider: Provider) {
  if (provider === 'openai' && openai) {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      input: prompt,
    });
    const output = response.output?.[0];
    if (output && 'content' in output) {
      const textSegment = output.content?.find((item) => item.type === 'text');
      if (textSegment && textSegment.type === 'text') {
        return textSegment.text;
      }
    }
  }

  if (provider === 'gemini' && gemini) {
    const model = gemini.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  return null;
}

async function callWithFallback(prompt: string) {
  const providers: Provider[] = [];
  if (openai) providers.push('openai');
  if (gemini) providers.push('gemini');

  if (providers.length === 0) {
    return JSON.stringify({ recommendations: FALLBACK_RECOMMENDATIONS });
  }

  for (const provider of providers) {
    try {
      const result = await callProvider(prompt, provider);
      if (result) {
        return result;
      }
    } catch (error) {
      console.error(`[AI] ${provider} call failed`, error);
      continue;
    }
  }

  return JSON.stringify({ recommendations: FALLBACK_RECOMMENDATIONS });
}

export async function getCareerRecommendations(payload: AssessmentPayload) {
  const cacheKey = hashCacheKey({ type: 'career_recommendations', payload });
  const cached = await getCachedResponse<{ recommendations: CareerRecommendation[] }>(cacheKey);
  if (cached) return cached.recommendations;

  const basePrompt = `Candidate data: ${JSON.stringify(payload)}.`;
  const prompt =
    payload.mode === 'QUICK'
      ? `You are an experienced career strategist. From the information provided, surface the single most relevant job path for an express diagnostic. Respond as JSON with key "recommendations" containing an array with exactly one object including: careerTitle, compatibilityScore (0-100), sector, description (max 3 sentences), requiredSkills (max 3 items), salaryRange (string), quickWins (array of 2 actionable bullet points). ${basePrompt}`
      : `You are an experienced career strategist. Using the detailed profile, craft three job recommendations that unlock longer-term mobility. Respond as JSON with key "recommendations" containing exactly three objects with: careerTitle, compatibilityScore (0-100), sector, description (max 4 sentences), requiredSkills (5 tailored skills), salaryRange (string), developmentFocus (array of 2-3 upskilling themes). ${basePrompt}`;

  const response = await callWithFallback(prompt);

  try {
    const parsed = JSON.parse(response) as { recommendations?: CareerRecommendation[] };
    if (parsed?.recommendations?.length) {
      await setCachedResponse(cacheKey, parsed, 60 * 60 * 12);
      return parsed.recommendations;
    }
  } catch (error) {
    console.error('[AI] Failed to parse career recommendations', error);
  }

  await setCachedResponse(cacheKey, { recommendations: FALLBACK_RECOMMENDATIONS }, 60 * 30);
  return FALLBACK_RECOMMENDATIONS;
}

export async function generateCoverLetter(context: {
  jobTitle: string;
  company: string;
  tone: 'professional' | 'friendly' | 'impactful';
  highlights: string[];
  resumeSummary: string;
}) {
  const cacheKey = hashCacheKey({ type: 'cover_letter', context });
  const cached = await getCachedResponse<{ content: string }>(cacheKey);
  if (cached) return cached.content;

  const prompt = `Write a ${context.tone} cover letter for the ${context.jobTitle} role at ${context.company}. Mention the following highlights: ${context.highlights.join(', ')}. Resume summary: ${context.resumeSummary}. Output Markdown.`;
  const response = await callWithFallback(prompt);

  await setCachedResponse(cacheKey, { content: response }, 60 * 60 * 6);
  return response;
}

export async function generateInterviewCoachResponse(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  focusArea: string,
) {
  const prompt = `You are Luna, a warm but direct interview coach. Continue the conversation. Focus area: ${focusArea}. History: ${JSON.stringify(history)}.`;
  return callWithFallback(prompt);
}

export async function analyzeAssessmentResults(payload: AssessmentPayload) {
  const modePrompt =
    payload.mode === 'QUICK'
      ? `Produce a concise snapshot (max 5 sentences) highlighting dominant personality drivers, key motivation levers, and one immediate action to test alignment. Close with a sentence teasing what a complete assessment would unlock.`
      : `Draft a structured briefing with two short paragraphs: first synthesise Big Five + RIASEC dominant factors and how they support the candidate narrative, then outline two to three development priorities referencing strengths, growth areas, and interests. End with a CTA suggesting the best Phoenix module to activate next.`;

  const response = await callWithFallback(`${modePrompt}\nData: ${JSON.stringify(payload)}`);
  return response;
}

export async function generateResume(payload: ResumeGenerationPayload) {
  const cacheKey = hashCacheKey({ type: 'resume', payload });
  const cached = await getCachedResponse<ResumeGenerationResult>(cacheKey);
  if (cached) return cached;

  const language = payload.language ?? 'fr';
  const tone = payload.tone ?? 'impact';

  const contextBlocks: string[] = [];

  if (payload.context?.selectedMatch) {
    contextBlocks.push(
      `Focus role: ${payload.context.selectedMatch.title} (compatibility ${payload.context.selectedMatch.compatibilityScore ?? 'n/a'}). Key skills: ${(payload.context.selectedMatch.requiredSkills ?? []).join(', ')}. Salary target: ${payload.context.selectedMatch.salaryRange ?? 'n/a'}.`,
    );
  }

  if (payload.context?.strengths?.length) {
    contextBlocks.push(`Strengths: ${payload.context.strengths.join(', ')}`);
  }

  if (payload.context?.workPreferences?.length) {
    contextBlocks.push(`Preferences: ${payload.context.workPreferences.join(', ')}`);
  }

  if (payload.context?.growthAreas?.length) {
    contextBlocks.push(`Growth areas: ${payload.context.growthAreas.join(', ')}`);
  }

  if (payload.context?.interests?.length) {
    contextBlocks.push(`Interests: ${payload.context.interests.join(', ')}`);
  }

  if (payload.context?.quickWins?.length) {
    contextBlocks.push(`Quick wins already identified: ${payload.context.quickWins.join(', ')}`);
  }

  if (payload.context?.developmentFocus?.length) {
    contextBlocks.push(`Development focus themes: ${payload.context.developmentFocus.join(', ')}`);
  }

  if (payload.context?.narrative) {
    contextBlocks.push(`Career narrative: ${payload.context.narrative}`);
  }

  if (payload.context?.modules) {
    const enabledModules = Object.entries(payload.context.modules)
      .filter(([, enabled]) => enabled)
      .map(([module]) => module)
      .join(', ');
    if (enabledModules) {
      contextBlocks.push(`Phoenix modules activated: ${enabledModules}`);
    }
  }

  const contextSummary = contextBlocks.length > 0 ? contextBlocks.join('\n') : 'No additional Phoenix context provided.';

  const prompt = `You are a senior resume strategist crafting a ${payload.template} resume for the ${payload.targetRole} role. Tone should be ${tone} and the document must be written in ${language === 'en' ? 'English' : 'French'}. Use Markdown with sections: Header, Summary, Key Achievements, Professional Experience, Skills. Highlight measurable impact, align with the target role, and respect ATS best practices (short bullet sentences, metrics, keywords). Careers context from Phoenix ecosystem:\n${contextSummary}.\nBase summary:${payload.summary}.\nExperience blocks:${JSON.stringify(payload.experiences)}.\nSkills:${payload.skills.join(', ')}.\nRespond strictly as JSON with keys: resumeMarkdown (string Markdown), atsChecklist (array of 4 concise bullet strings), alignScore (0-100 number estimating alignment with target role), nextActions (array of 3 coaching actions referencing Phoenix modules when relevant).`;

  const response = await callWithFallback(prompt);

  try {
    const parsed = JSON.parse(response) as ResumeGenerationResult;
    if (parsed?.resumeMarkdown) {
      await setCachedResponse(cacheKey, parsed, 60 * 60 * 6);
      return parsed;
    }
  } catch (error) {
    console.error('[AI] Failed to parse resume generation response', error);
  }

  const fallback: ResumeGenerationResult = {
    resumeMarkdown: `# ${payload.targetRole}\n\n## Summary\nProfessional ready to drive impact on ${payload.targetRole}.\n\n## Key Achievements\n- Mise en avant d'un résultat chiffré majeur.\n\n## Professional Experience\n${payload.experiences
      .map(
        (exp) =>
          `### ${exp.role} — ${exp.company}\n${exp.achievements
            .slice(0, 3)
            .map((achievement) => `- ${achievement}`)
            .join('\n')}`,
      )
      .join('\n\n')}\n\n## Skills\n${payload.skills.join(', ')}`,
    atsChecklist: [
      'Inclure des verbes d’action forts dans chaque bullet.',
      'Vérifier que chaque réalisation comporte une métrique.',
      'Adapter les mots-clés aux offres visées.',
      'Conserver un format clair et ATS-friendly (titres, listes courtes).',
    ],
    alignScore: 72,
    nextActions: [
      'Comparer ce CV avec les trajectoires Aube prioritaires.',
      'Utiliser Rise pour transformer les réalisations en réponses structurées.',
      'Partager le brouillon avec Luna pour une relecture ciblée.',
    ],
  };

  await setCachedResponse(cacheKey, fallback, 60 * 15);
  return fallback;
}

export async function getInterviewPracticeSet(payload: { role: string; focus: 'behavioral' | 'strategic' | 'technical' }) {
  const cacheKey = hashCacheKey({ type: 'interview_set', payload });
  const cached = await getCachedResponse<{ questions: InterviewQuestion[] }>(cacheKey);
  if (cached) return cached.questions;

  const prompt = `Generate six interview questions for a ${payload.role} role focused on ${payload.focus}. Respond in JSON with array 'questions' and each item having question, competency, and guidance.`;
  const response = await callWithFallback(prompt);

  try {
    const parsed = JSON.parse(response) as { questions?: InterviewQuestion[] };
    if (parsed?.questions?.length) {
      await setCachedResponse(cacheKey, parsed, 60 * 60 * 12);
      return parsed.questions;
    }
  } catch (error) {
    console.error('[AI] Failed to parse interview set', error);
  }

  const fallback: InterviewQuestion[] = [
    {
      question: 'Parlez-moi d’un projet où vous avez dû prioriser plusieurs enjeux contradictoires.',
      competency: 'Priorisation & Leadership',
      guidance: 'Structurez avec la méthode STAR, insistez sur vos arbitrages et l’impact final.',
    },
    {
      question: 'Comment mesurez-vous le succès d’une initiative clé dans ce rôle ?',
      competency: 'Orientation résultats',
      guidance: 'Partagez vos KPI, les outils utilisés et comment vous ajustez vos plans.',
    },
  ];

  await setCachedResponse(cacheKey, { questions: fallback }, 60 * 10);
  return fallback;
}
