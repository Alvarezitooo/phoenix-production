export type EnergyActionKey =
  | 'cv.generate'
  | 'letters.generate'
  | 'letters.publish'
  | 'rise.generate'
  | 'rise.saveNotes'
  | 'luna.chat'
  | 'luna.hint'
  | 'export.pdf'
  | 'assessment.quick'
  | 'assessment.complete'
  | 'aube.reveal';

export const ENERGY_COSTS: Record<EnergyActionKey, number> = {
  'cv.generate': 3,
  'letters.generate': 3,
  'letters.publish': 2,
  'rise.generate': 2,
  'rise.saveNotes': 0,
  'luna.chat': 1,
  'luna.hint': 1,
  'export.pdf': 2,
  'assessment.quick': 1,
  'assessment.complete': 3,
  'aube.reveal': 1,
};

export const STREAK_LENGTH_FOR_BONUS = 3;
export const STREAK_BONUS_AMOUNT = 5;

export type EnergyPackId = 'cafe' | 'petit-dej' | 'repas' | 'buffet';

export type EnergyPack = {
  id: EnergyPackId;
  name: string;
  priceEuros: number;
  energyAmount: number | 'unlimited';
  description: string;
  approxConversions?: {
    cvCount?: number;
    letterCount?: number;
  };
  notes?: string;
  highlight?: boolean;
  stripePriceEnvKey?: string;
};

export const ENERGY_PACKS: EnergyPack[] = [
  {
    id: 'cafe',
    name: 'Café Luna',
    priceEuros: 2.99,
    energyAmount: 40,
    description: 'Idéal pour une session rapide (CV, lettre ou atelier express).',
    approxConversions: {
      cvCount: 13,
      letterCount: 8,
    },
    notes: 'Crédits utilisables à vie, sans abonnement.',
    stripePriceEnvKey: 'STRIPE_PRICE_PACK_CAFE',
  },
  {
    id: 'petit-dej',
    name: 'Petit-déj Luna',
    priceEuros: 5.99,
    energyAmount: 90,
    description: 'Prépare une semaine de génération et quelques échanges avec Luna.',
    approxConversions: {
      cvCount: 30,
      letterCount: 20,
    },
    highlight: true,
    notes: 'Idéal pour alterner CV, lettres et coaching Rise sur une semaine.',
    stripePriceEnvKey: 'STRIPE_PRICE_PACK_PETIT_DEJ',
  },
  {
    id: 'repas',
    name: 'Repas Luna',
    priceEuros: 9.99,
    energyAmount: 170,
    description: 'Parfait pour une phase intensive CV + Rise + lettres.',
    approxConversions: {
      cvCount: 56,
      letterCount: 37,
    },
    notes: 'Pensé pour un mois de candidatures actives.',
    stripePriceEnvKey: 'STRIPE_PRICE_PACK_REPAS',
  },
  {
    id: 'buffet',
    name: 'Buffet à volonté',
    priceEuros: 17.99,
    energyAmount: 'unlimited',
    description: 'Énergie illimitée avec fair-use intelligent pour les power users.',
    notes: 'Accès illimité (fair-use). 40% moins cher que Kickresume ou Resume.io.',
    stripePriceEnvKey: 'STRIPE_PRICE_PACK_BUFFET',
  },
];

export const LETTER_PUBLICATION_COST = ENERGY_COSTS['letters.publish'];

export function getEnergyPackById(id: string): EnergyPack | undefined {
  return ENERGY_PACKS.find((pack) => pack.id === id);
}
