import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import type { AssessmentMode } from '@prisma/client';
import { getCachedResponse, hashCacheKey, setCachedResponse } from '@/lib/cache';

const openAiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GOOGLE_GENERATIVE_API_KEY;

const openai = openAiKey ? new OpenAI({ apiKey: openAiKey }) : null;
const gemini = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

type Provider = 'openai' | 'gemini';

const PROMPT_VERSION = 'aube_reco_fr_v3';

export type CareerRecommendation = {
  id?: string;
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

const RIASEC_SECTOR_MAP: Record<string, { sectors: string[]; keywords: string[] }> = {
  realistic: {
    sectors: ['Industrie', 'Opérations', 'Logistique', 'Maintenance'],
    keywords: ['technicien', 'responsable maintenance', 'coordinateur logistique'],
  },
  investigative: {
    sectors: ['Recherche', 'Data', 'Conseil scientifique', 'Analyse économique'],
    keywords: ['analyste', 'chargé d’études', 'consultant data'],
  },
  artistic: {
    sectors: ['Culture', 'Communication', 'UX/UI', 'Marketing de contenu'],
    keywords: ['designer', 'responsable éditorial', 'chef de projet culturel'],
  },
  social: {
    sectors: ['RH', 'Education', 'Coaching', 'Santé', 'Economie sociale'],
    keywords: ['coach', 'formateur', 'responsable RH', 'chargé d’accompagnement'],
  },
  enterprising: {
    sectors: ['Entrepreneuriat', 'Développement commercial', 'Gestion de projets'],
    keywords: ['business developer', 'chef de projet', 'directeur de centre'],
  },
  conventional: {
    sectors: ['Finance', 'Gestion', 'Administration', 'Supply chain'],
    keywords: ['contrôleur de gestion', 'responsable administratif', 'gestionnaire paie'],
  },
};

const BIG_FIVE_DESCRIPTORS: Record<string, { label: string; high: string; low: string }> = {
  openness: {
    label: 'Ouverture',
    high: 'curiosité intellectuelle, appétence pour la nouveauté',
    low: 'préférence pour des environnements structurés et éprouvés',
  },
  conscientiousness: {
    label: 'Rigueur',
    high: 'organisation, sens du détail, fiabilité sur les livrables',
    low: 'approche plus intuitive, besoin d’un cadre souple',
  },
  extraversion: {
    label: 'Extraversion',
    high: 'goût du collectif, énergie en interaction',
    low: 'préférence pour des environnements calmes et analytiques',
  },
  agreeableness: {
    label: 'Coopération',
    high: 'écoute, recherche du consensus, sens du service',
    low: 'assertivité, franchise, capacité à challenger',
  },
  neuroticism: {
    label: 'Stabilité émotionnelle',
    high: 'gestion sereine des imprévus, bonne mise à distance',
    low: 'sensibilité élevée, vigilance aux environnements stressants',
  },
};

const RIASEC_LABELS_FR: Record<string, string> = {
  realistic: 'Réaliste',
  investigative: 'Investigateur',
  artistic: 'Artistique',
  social: 'Social',
  enterprising: 'Entreprenant',
  conventional: 'Conventionnel',
};

function describeBigFiveScores(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores ?? {});
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 2);
  const statements = top.map(([key, value]) => {
    const descriptor = BIG_FIVE_DESCRIPTORS[key];
    if (!descriptor) {
      return `${key} (${value}/5)`;
    }
    const quality = value >= 4 ? descriptor.high : value <= 2 ? descriptor.low : 'profil équilibré sur ce trait';
    return `${descriptor.label} (${value}/5) — ${quality}`;
  });
  return statements.join('; ');
}

function describeRiasecScores(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores ?? {});
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 3);
  const statements = sorted.map(([key, value]) => {
    const label = RIASEC_LABELS_FR[key] ?? key;
    const mapping = RIASEC_SECTOR_MAP[key] ?? null;
    const sectors = mapping ? mapping.sectors.slice(0, 2).join(', ') : undefined;
    return sectors ? `${label} (${value}/5) — secteurs à privilégier : ${sectors}` : `${label} (${value}/5)`;
  });
  return statements.join(' | ');
}

function buildProfileNarrative(payload: AssessmentPayload, bigFive?: string | null, riasec?: string | null) {
  const segments: string[] = [];
  if (bigFive) {
    segments.push(`Traits dominants : ${bigFive}.`);
  }
  if (riasec) {
    segments.push(`Univers RIASEC prioritaires : ${riasec}.`);
  }
  if (payload.workPreferences?.length) {
    segments.push(`Préférences de travail : ${payload.workPreferences.join(', ')}.`);
  }
  if (payload.strengths?.length) {
    segments.push(`Forces déjà mobilisées : ${payload.strengths.join(', ')}.`);
  }
  if (payload.growthAreas?.length) {
    segments.push(`Axes de progression visés : ${payload.growthAreas.join(', ')}.`);
  }
  if (payload.interests?.length) {
    segments.push(`Centres d’intérêt métiers : ${payload.interests.join(', ')}.`);
  }
  if (payload.narrative) {
    segments.push(`Ambition exprimée : ${payload.narrative}.`);
  }
  if (payload.keyMoments) {
    const highlights = payload.keyMoments
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(' | ');
    if (highlights) {
      segments.push(`Expériences marquantes : ${highlights}.`);
    }
  }
  if (payload.roleVision) {
    segments.push(`Trajectoire visée : ${payload.roleVision}.`);
  }
  if (payload.nonNegotiables) {
    segments.push(`Contraintes clés : ${payload.nonNegotiables}.`);
  }
  if (payload.energyBoosters) {
    segments.push(`Sources d’énergie : ${payload.energyBoosters}.`);
  }
  if (payload.energyDrainers) {
    segments.push(`Points d’attention énergie : ${payload.energyDrainers}.`);
  }
  return segments.join(' ');
}

type AssessmentPayload = {
  mode: AssessmentMode;
  bigFive: Record<string, number>;
  riasec: Record<string, number>;
  workPreferences: string[];
  strengths: string[];
  growthAreas?: string[];
  interests?: string[];
  narrative?: string;
  keyMoments?: string;
  roleVision?: string;
  nonNegotiables?: string;
  energyBoosters?: string;
  energyDrainers?: string;
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
    careerTitle: 'Responsable innovation sociale',
    compatibilityScore: 86,
    sector: 'Économie sociale et solidaire',
    description:
      'Piloter des projets à impact au sein d’associations ou de collectivités, en mobilisant partenaires publics et privés pour répondre à des enjeux sociétaux concrets.',
    requiredSkills: ['Gestion de projet', 'Mobilisation de partenaires', 'Analyse d’impact', 'Communication'],
    salaryRange: '45 000 € – 60 000 € bruts/an',
    quickWins: ['Identifier trois partenaires potentiels pour un programme pilote', 'Construire un indicateur d’impact à partager au comité de pilotage'],
    developmentFocus: ['Financement de l’innovation sociale', 'Mesure d’impact avancée'],
  },
  {
    careerTitle: 'Consultant data secteur public',
    compatibilityScore: 83,
    sector: 'Conseil & Data',
    description:
      'Accompagner ministères et collectivités dans l’exploitation de la donnée pour optimiser les politiques publiques et la relation usager.',
    requiredSkills: ['Analyse statistique', 'Visualisation', 'Gestion de changement', 'Culture service public'],
    salaryRange: '50 000 € – 70 000 € bruts/an',
    quickWins: ['Réaliser un diagnostic express des jeux de données disponibles', 'Proposer un tableau de bord à destination des décideurs terrain'],
    developmentFocus: ['Data storytelling', 'Conduite de projets réglementaires'],
  },
  {
    careerTitle: 'Chargé·e de mission transition écologique',
    compatibilityScore: 78,
    sector: 'Transition énergétique & climat',
    description:
      'Coordonner des plans d’action climat au sein d’entreprises ou de collectivités, en impliquant les métiers autour d’objectifs bas carbone.',
    requiredSkills: ['Gestion de programmes', 'Analyse carbone', 'Animation d’ateliers', 'Veille réglementaire'],
    salaryRange: '42 000 € – 58 000 € bruts/an',
    quickWins: ['Cartographier les initiatives bas carbone existantes', 'Construire un plan de sensibilisation collaborateurs sur 3 mois'],
    developmentFocus: ['Financement de la transition', 'Pilotage d’indicateurs climat'],
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
      const textSegment = output.content?.find((item) => {
        const segment = item as { type?: string };
        return segment.type === 'text' || segment.type === 'output_text';
      }) as { type?: string; text?: string } | undefined;
      if (textSegment?.text) {
        return textSegment.text;
      }
    }
  }

  if (provider === 'gemini' && gemini) {
    const configuredModel = process.env.GEMINI_MODEL ?? 'models/gemini-2.5-flash';
    const modelId = configuredModel.startsWith('models/') ? configuredModel : `models/${configuredModel}`;
    const model = gemini.getGenerativeModel({ model: modelId });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  return null;
}

function buildRiasecContext(riasecScores: Record<string, number>) {
  const entries = Object.entries(riasecScores)
    .map(([key, value]) => [key.toLowerCase(), value] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const sectors = new Set<string>();
  const keywords = new Set<string>();

  for (const [code] of entries) {
    const mapping = RIASEC_SECTOR_MAP[code] ?? null;
    if (mapping) {
      mapping.sectors.forEach((sector) => sectors.add(sector));
      mapping.keywords.forEach((keyword) => keywords.add(keyword));
    }
  }

  if (sectors.size === 0 && keywords.size === 0) return null;

  return {
    sectors: Array.from(sectors).slice(0, 5),
    keywords: Array.from(keywords).slice(0, 7),
  };
}

async function callWithFallback(prompt: string) {
  const providers: Provider[] = [];
  if (gemini) providers.push('gemini');
  if (openai) providers.push('openai');

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
  const cacheKey = hashCacheKey({ type: 'career_recommendations', payload, version: PROMPT_VERSION });
  const cached = await getCachedResponse<{ recommendations: CareerRecommendation[] }>(cacheKey);
  if (cached) return cached.recommendations;

  const bigFiveSummary = describeBigFiveScores(payload.bigFive);
  const riasecSummary = describeRiasecScores(payload.riasec);
  const profileNarrative = buildProfileNarrative(payload, bigFiveSummary, riasecSummary);
  const profileContext = [bigFiveSummary, riasecSummary, profileNarrative]
    .filter(Boolean)
    .join(' ');

  const basePrompt = profileContext.length > 0 ? profileContext : `Données candidat : ${JSON.stringify(payload)}.`;
  const riasecContext = buildRiasecContext(payload.riasec);
  const extraContext = riasecContext
    ? `Réponds strictement en français et contextualise pour le marché de l’emploi en France. Varie les secteurs proposés en t’appuyant sur : ${riasecContext.sectors.join(
        ', ',
      )}. Utilise ou combine les mots-clés suivants si pertinent : ${riasecContext.keywords.join(
        ', ',
      )}. Évite les doublons (pas plus d’un métier par secteur) et proscris les intitulés trop génériques (ex. “Product Manager”) sauf justification claire.`
    : 'Réponds en français, contextualise pour le marché français et propose des secteurs variés en évitant la répétition de métiers tech génériques.';

  const prompt =
    payload.mode === 'QUICK'
      ? `Tu es une stratège de carrière senior. À partir des éléments suivants, propose un seul métier prioritaire pour un diagnostic express : ${basePrompt} Retourne un JSON avec la clé "recommendations" contenant exactement UN objet comprenant : careerTitle, compatibilityScore (0-100), sector, description (3 phrases maximum), requiredSkills (3 compétences clés maximum), salaryRange (texte en euros ou fourchette cohérente), quickWins (tableau de 2 actions concrètes). ${extraContext}`
      : `Tu es une stratège de carrière senior. À partir du profil décrit ci-dessous, propose trois métiers complémentaires permettant une mobilité durable : ${basePrompt} Retourne un JSON avec la clé "recommendations" contenant exactement TROIS objets comprenant : careerTitle, compatibilityScore (0-100), sector, description (4 phrases maximum), requiredSkills (5 compétences précises), salaryRange (texte en euros ou fourchette cohérente), developmentFocus (tableau de 2 à 3 thèmes d’upskilling contextualisés au métier). ${extraContext}`;

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

type CoverLetterPayload = {
  jobTitle: string;
  company: string;
  hiringManager?: string;
  tone: 'professional' | 'friendly' | 'impactful' | 'storytelling' | 'executive';
  language: 'fr' | 'en';
  highlights: string[];
  alignmentHooks?: string[];
  resumeSummary: string;
};

type CoverLetterResult = {
  letterMarkdown: string;
  bulletSummary: string[];
  callToAction: string;
  alignScore?: number;
};

export async function generateCoverLetter(payload: CoverLetterPayload) {
  const cacheKey = hashCacheKey({ type: 'cover_letter', payload });
  const cached = await getCachedResponse<CoverLetterResult>(cacheKey);
  if (cached) return cached.letterMarkdown;

  const languageLabel = payload.language === 'en' ? 'anglais' : 'français';
  const toneMap: Record<CoverLetterPayload['tone'], string> = {
    professional: 'professionnel',
    friendly: 'chaleureux',
    impactful: 'percutant',
    storytelling: 'narratif',
    executive: 'exécutif',
  };
  const toneLabel = toneMap[payload.tone];
  const hooks = payload.alignmentHooks?.length ? payload.alignmentHooks.join(' | ') : "Relier vos motivations à la culture de l’entreprise.";

  const prompt = `Tu es un copywriter carrière senior. Rédige en ${languageLabel} une lettre de motivation pour le poste ${payload.jobTitle} chez ${payload.company}. Le ton doit être ${toneLabel}. Retourne un JSON avec les clés : letterMarkdown (Markdown avec introduction, section impact, section alignement culturel, conclusion), bulletSummary (tableau de 3 puces résumant la lettre), callToAction (phrase de conclusion), alignScore (estimation 0-100). Mets en avant les éléments suivants : ${payload.highlights.join(
    ', ',
  )}. Nom du recruteur : ${payload.hiringManager ?? 'non précisé'}. Points d’alignement : ${hooks}. Résumé de CV : ${payload.resumeSummary}. Assure-toi que la lettre respecte les codes de politesse du ${languageLabel}.`;

  const response = await callWithFallback(prompt);

  try {
    const parsed = JSON.parse(response) as CoverLetterResult;
    if (parsed?.letterMarkdown) {
      await setCachedResponse(cacheKey, parsed, 60 * 60 * 6);
      return parsed.letterMarkdown;
    }
  } catch (error) {
    console.error('[AI] Failed to parse cover letter', error);
  }

  await setCachedResponse(cacheKey, { letterMarkdown: response, bulletSummary: [], callToAction: '', alignScore: undefined }, 60 * 30);
  return response;
}

export async function generateInterviewCoachResponse(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  focusArea: string,
) {
  const prompt = `Tu es Luna, coach d’entretien bienveillante mais directe. Poursuis la conversation en guidant l’utilisateur, en t’appuyant sur le focus suivant : ${focusArea}. Historique : ${JSON.stringify(
    history,
  )}. Réponds en français, propose des questions de relance concrètes et des conseils actionnables.`;
  return callWithFallback(prompt);
}

export async function analyzeAssessmentResults(payload: AssessmentPayload) {
  const modePrompt =
    payload.mode === 'QUICK'
      ? `Rédige un aperçu synthétique (5 phrases maximum) mettant en avant les moteurs de personnalité dominants, les leviers de motivation et une action immédiate pour tester l’alignement. Termine par une phrase expliquant ce que débloquerait l’analyse complète.`
      : `Rédige un brief structuré en deux courts paragraphes : le premier synthétise les facteurs dominants Big Five + RIASEC et la façon dont ils nourrissent la narration professionnelle, le second propose deux à trois priorités de développement en s’appuyant sur les forces, axes de progression et centres d’intérêt. Conclus par un appel à l’action vers le module Phoenix le plus pertinent pour la suite.`;

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

  const toneMap: Record<NonNullable<ResumeGenerationPayload['tone']>, string> = {
    impact: 'orienté impact',
    leadership: 'leadership',
    international: 'international',
    default: 'équilibré',
  };
  const prompt = `Tu es une stratège CV senior. Conçois un CV format ${payload.template} pour le rôle ${payload.targetRole}. Le ton doit être ${toneMap[tone] ?? tone} et le document doit être rédigé en ${language === 'en' ? 'anglais' : 'français'}. Utilise du Markdown structuré avec les sections : En-tête, Résumé, Réalisations clés, Expériences professionnelles, Compétences. Mets en avant des résultats chiffrés, adapte les mots-clés au rôle cible et respecte les bonnes pratiques ATS (phrases courtes, verbes d’action). Contexte issu de l’écosystème Phoenix :\n${contextSummary}.\nRésumé de base : ${payload.summary}.\nBlocs d’expérience : ${JSON.stringify(payload.experiences)}.\nCompétences : ${payload.skills.join(
    ', ',
  )}.\nRéponds exclusivement en JSON avec les clés : resumeMarkdown (Markdown), atsChecklist (tableau de 4 puces courtes), alignScore (nombre 0-100 estimant l’alignement), nextActions (tableau de 3 actions de coaching liées aux modules Phoenix quand pertinent).`;

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

  const focusLabels: Record<typeof payload.focus, string> = {
    behavioral: 'comportemental',
    strategic: 'stratégique',
    technical: 'technique',
  };
  const prompt = `Génère six questions d’entretien pour un rôle ${payload.role} avec un focus ${focusLabels[payload.focus]}. Réponds en JSON avec la clé "questions" contenant des objets { question, competency, guidance }. Assure-toi que les questions sont adaptées au marché français.`;
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
