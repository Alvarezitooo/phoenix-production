export type RiseQuest = {
  id: string;
  title: string;
  description: string;
  energyReward: number;
};

export const RISE_QUESTS: RiseQuest[] = [
  {
    id: 'alignement_intentions',
    title: 'Clarifier ton intention',
    description: 'Écris en une phrase ce que tu souhaites manifester avec ton prochain rôle.',
    energyReward: 2,
  },
  {
    id: 'carte_forces',
    title: 'Carte des forces',
    description: 'Liste trois forces reconnues par ton entourage et comment elles se traduisent.',
    energyReward: 2,
  },
  {
    id: 'rituel_respirations',
    title: '3 respirations conscientes',
    description: 'Prends 3 minutes pour respirer profondément et noter le ressenti dans Rise.',
    energyReward: 1,
  },
  {
    id: 'scenario_entretien',
    title: 'Scénario d’entretien',
    description: 'Imagine la question la plus déstabilisante et écris ta réponse Luna-style.',
    energyReward: 2,
  },
  {
    id: 'prototype_pitch',
    title: 'Pitch 30 secondes',
    description: 'Formule ton pitch voix haute, note-le pour t’en souvenir (Rise).',
    energyReward: 1,
  },
  {
    id: 'journal_micro_victoire',
    title: 'Micro-victoire du jour',
    description: 'Consigne une action dont tu es fier·e aujourd’hui dans le journal Rise.',
    energyReward: 1,
  },
  {
    id: 'rituel_confiance',
    title: 'Rituel confiance',
    description: 'Choisis un rituel de la checklist et planifie-le dans ton agenda.',
    energyReward: 1,
  },
];

export const RISE_BADGE_ID = 'rise_constellation';
export const RISE_BADGE_THRESHOLD = 5;
