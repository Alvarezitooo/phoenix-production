export type DailyRitual = {
  id: string;
  title: string;
  description: string;
  energyReward: number;
};

export const DAILY_RITUALS: DailyRitual[] = [
  {
    id: 'breath-align',
    title: 'Respiration alignée',
    description: '3 cycles de respiration profonde pour calmer l’énergie.',
    energyReward: 1,
  },
  {
    id: 'intention-note',
    title: 'Intention du jour',
    description: 'Écrire une phrase d’intention dans ton journal.',
    energyReward: 1,
  },
  {
    id: 'gratitude-flash',
    title: 'Flash gratitude',
    description: 'Remercier une personne (message ou pensée).',
    energyReward: 1,
  },
];
