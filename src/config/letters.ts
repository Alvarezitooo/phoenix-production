export const LETTER_TONES = ['professional', 'friendly', 'impactful', 'storytelling', 'executive'] as const;
export type LetterTone = (typeof LETTER_TONES)[number];

export const LETTER_TONE_LABEL: Record<LetterTone, string> = {
  professional: 'professionnel',
  friendly: 'chaleureux',
  impactful: 'percutant',
  storytelling: 'narratif',
  executive: 'exécutif',
};

export type LetterRuneId = 'REVELER' | 'ANCRER' | 'PROPULSER' | 'ECLAIRER' | 'ALIGNER';

export type LetterRune = {
  id: LetterRuneId;
  label: string;
  description: string;
  keywords: string[];
};

export const LETTER_RUNES: LetterRune[] = [
  {
    id: 'REVELER',
    label: 'Révéler',
    description: 'Mettre en lumière une singularité, ouvrir sur l’authenticité et la confiance partagée.',
    keywords: ['révèle', 'authenticité', 'confiance', 'transparence', 'partage', 'vulnerable', 'histoire'],
  },
  {
    id: 'ANCRER',
    label: 'Ancrer',
    description: 'Structurer, sécuriser et démontrer une fiabilité opérationnelle.',
    keywords: ['structure', 'ancre', 'fiable', 'processus', 'rigueur', 'stabilité', 'cadre'],
  },
  {
    id: 'PROPULSER',
    label: 'Propulser',
    description: 'Projeter vers l’action, la croissance et l’impact mesurable.',
    keywords: ['propulse', 'accélère', 'croissance', 'impact', 'scaler', 'déploiement', 'performance'],
  },
  {
    id: 'ECLAIRER',
    label: 'Éclairer',
    description: 'Apporter vision, analyse et clarté stratégique.',
    keywords: ['éclaire', 'vision', 'stratégie', 'analyse', 'insight', 'guide', 'compréhension'],
  },
  {
    id: 'ALIGNER',
    label: 'Aligner',
    description: 'Créer de la cohérence humaine et culturelle, connecter les parties prenantes.',
    keywords: ['alignement', 'culture', 'cohésion', 'harmonie', 'collaboration', 'collectif', 'partenaires'],
  },
];

type RuneInferenceContext = {
  keywords?: string[];
  tone?: LetterTone;
  textBlocks?: string[];
};

export type InferredLetterRune = {
  rune: LetterRune;
  confidence: number;
  matchedKeywords: string[];
};

const toneBias: Record<LetterTone, LetterRuneId> = {
  professional: 'ANCRER',
  friendly: 'ALIGNER',
  impactful: 'PROPULSER',
  storytelling: 'REVELER',
  executive: 'ECLAIRER',
};

export function inferLetterRune(context: RuneInferenceContext = {}): InferredLetterRune {
  const aggregate = [
    ...(context.keywords ?? []),
    ...(context.textBlocks ?? []).map((block) => block ?? '').join(' ').split(/\s+/g),
  ]
    .map((word) => word.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿç-]/gi, ''))
    .filter(Boolean);

  const scoreMap = LETTER_RUNES.map((rune) => {
    const matches = rune.keywords.filter((keyword) => aggregate.includes(keyword.toLowerCase()));
    let score = matches.length;
    if (context.tone && toneBias[context.tone] === rune.id) {
      score += 0.75;
    }
    return { rune, matches, score };
  });

  const best = scoreMap.sort((a, b) => b.score - a.score)[0];

  const fallback = LETTER_RUNES.find((rune) => rune.id === toneBias[context.tone ?? 'friendly']) ?? LETTER_RUNES[4];
  const chosen = best && best.score > 0 ? best : { rune: fallback, matches: [], score: 0.5 };

  const confidence = Math.min(1, Math.max(0.1, chosen.score / 4));

  return {
    rune: chosen.rune,
    confidence,
    matchedKeywords: [...new Set(chosen.matches)],
  };
}
