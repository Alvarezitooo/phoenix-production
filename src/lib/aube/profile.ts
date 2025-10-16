import type { JournalEntry } from '@prisma/client';

export type AubeInput = {
  promptKey: string;
  content: string;
};

export type AubeProfileSummary = {
  forces: string[];
  shadow: string;
  element: ElementKey;
  clarityNote: string;
};

type ElementKey = 'FEU' | 'EAU' | 'AIR' | 'TERRE' | 'ETHER';

type KeywordMap = Record<string, string[]>;

type TraitDescriptor = {
  label: string;
  keywords: string[];
};

const ELEMENT_KEYWORDS: Record<ElementKey, string[]> = {
  FEU: ['audace', 'leadership', 'oser', 'impact', 'pulsation', 'vision', 'créatif', 'action'],
  EAU: ['écoute', 'intuition', 'fluidité', 'douceur', 'empathie', 'soin', 'harmonie'],
  AIR: ['idée', 'analyse', 'concept', 'innovation', 'réflexion', 'apprentissage', 'communication'],
  TERRE: ['structure', 'stabilité', 'fiabilité', 'ancrage', 'organisation', 'concret', 'process'],
  ETHER: ['transcendance', 'énergie', 'alignement', 'sens', 'méditation', 'spirituel'],
};

const FORCE_TRAITS: TraitDescriptor[] = [
  { label: 'Vision', keywords: ['vision', 'futur', 'ambition', 'impact'] },
  { label: 'Élan créatif', keywords: ['créatif', 'imagination', 'inventer', 'artistique'] },
  { label: 'Empathie', keywords: ['écoute', 'soutien', 'empathie', 'relation'] },
  { label: 'Clarté analytique', keywords: ['analyse', 'réflexion', 'structurer', 'données'] },
  { label: 'Rigueur', keywords: ['organisation', 'précis', 'structure', 'fiable'] },
  { label: 'Courage', keywords: ['oser', 'audace', 'sortir', 'risque'] },
  { label: 'Transmission', keywords: ['enseigner', 'partager', 'transmettre', 'coach'] },
  { label: 'Résilience', keywords: ['résilience', 'force', 'perseverer', 'rebondir'] },
  { label: 'Harmonie', keywords: ['harmonie', 'équilibre', 'apaiser', 'fluidité'] },
];

const SHADOW_KEYWORDS: KeywordMap = {
  'peur de se tromper': ['peur', 'doute', 'paralysé', 'bloqué'],
  'fatigue émotionnelle': ['fatigue', 'épuisé', 'trop', 'drainé'],
  'manque de clarté': ['confus', 'flou', 'perdu', 'incertitude'],
  'syndrome de l’imposteur': ['légitime', 'imposteur', 'légitimité', 'illégitime'],
  'perfectionnisme rigide': ['perfection', 'contrôle', 'rigide', 'erreur'],
};

function normalise(text: string): string {
  return text.normalize('NFD').replace(/[^a-zA-Z\s]/g, ' ').toLowerCase();
}

function scoreKeywords(content: string, keywords: string[]): number {
  const corpus = normalise(content);
  return keywords.reduce((score, keyword) => {
    const clean = normalise(keyword);
    if (corpus.includes(clean)) {
      return score + 1;
    }
    return score;
  }, 0);
}

export function buildAubeProfile(entries: AubeInput[]): AubeProfileSummary {
  const content = entries.map((entry) => entry.content).join(' ');
  const normalised = normalise(content);

  const elementScores = Object.entries(ELEMENT_KEYWORDS).map(([element, keywords]) => ({
    element: element as ElementKey,
    score: scoreKeywords(normalised, keywords),
  }));

  const bestElement =
    elementScores.sort((a, b) => b.score - a.score)[0]?.element ??
    ('AIR' as ElementKey);

  const traitScores = FORCE_TRAITS.map((trait) => ({
    label: trait.label,
    score: scoreKeywords(normalised, trait.keywords),
  }));
  const sortedTraits = traitScores
    .sort((a, b) => b.score - a.score)
    .filter((trait) => trait.score > 0)
    .map((trait) => trait.label);
  const fallbackTraits = ['Vision', 'Empathie', 'Rigueur'];
  const forces = [...new Set([...sortedTraits, ...fallbackTraits])].slice(0, 3);

  const shadowEntry = Object.entries(SHADOW_KEYWORDS)
    .map(([label, keywords]) => ({ label, score: scoreKeywords(normalised, keywords) }))
    .sort((a, b) => b.score - a.score)[0];
  const shadow = shadowEntry && shadowEntry.score > 0 ? shadowEntry.label : "doute diffus à clarifier";

  const claritySegments = [
    `Ton élément dominant semble être ${formatElement(bestElement)} : cultive ses qualités lorsque tu te sens aligné.`,
    `Tes forces mobilisables aujourd’hui : ${forces.join(', ')}.`,
    shadowEntry && shadowEntry.score > 0
      ? `Ombre à apprivoiser : ${shadow}.`
      : 'Ton ombre demande surtout de la douceur — écoute ton rythme intérieur.',
  ];

  return {
    forces,
    shadow,
    element: bestElement,
    clarityNote: claritySegments.join(' '),
  };
}

function formatElement(element: ElementKey): string {
  switch (element) {
    case 'FEU':
      return 'Feu (intuition et impact)';
    case 'EAU':
      return 'Eau (écoute et fluidité)';
    case 'AIR':
      return 'Air (idées et légèreté)';
    case 'TERRE':
      return 'Terre (ancrage et structure)';
    case 'ETHER':
      return 'Éther (vision et reliance)';
    default:
      return element;
  }
}

export function mapJournalEntriesToInputs(entries: Pick<JournalEntry, 'promptKey' | 'content'>[]): AubeInput[] {
  return entries.map((entry) => ({ promptKey: entry.promptKey, content: entry.content }));
}
