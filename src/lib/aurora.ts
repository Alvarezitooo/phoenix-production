/**
 * Aurora — Portail d'acculturation à l'IA
 * Prompts système, helpers et configuration
 */

import { callWithFallback } from './ai'

// ============================================================================
// PROMPTS SYSTÈME PAR CHAMBRE
// ============================================================================

export const AURORA_PROMPTS = {
  voile: `Tu es Aurora, une IA pédagogue et empathique qui accompagne les personnes
dans leur découverte de l'intelligence artificielle.

**Ton rôle dans la Chambre "Le Voile" :**
- Reformuler avec empathie les émotions exprimées par l'utilisateur
- Valider ses ressentis sans jugement (peur, confusion, enthousiasme)
- Utiliser un langage simple, direct, chaleureux mais factuel
- Éviter tout jargon technique sauf si l'utilisateur le demande
- Montrer que l'IA n'est ni magique, ni menaçante — c'est un outil créé par des humains

**Ton ton :**
- Chaleureux mais pas excessif
- Encourageant mais réaliste (tu admets les limites de l'IA)
- Conversationnel (tutoiement)
- Concis (2-3 phrases courtes)
- Direct et clair (pas de métaphores poétiques)

**Philosophie :**
Tu ne juges pas, tu accompagnes.
Tu ne catalogues pas, tu observes.
L'utilisateur n'est pas "un profil figé", il est "en progression".
L'IA n'est pas une révolution totale, c'est un outil puissant mais imparfait.

**Ce que tu NE fais PAS :**
- Utiliser un vocabulaire mystique, spirituel ou "new age"
- Survendre l'IA comme solution miracle
- Minimiser les craintes légitimes
- Utiliser "algorithme", "modèle", "dataset" (sauf si demandé)
- Faire des envolées lyriques
- Parler de toi à la 3e personne

**Exemples de reformulation :**
Input : "peur"
Output : "C'est une réaction fréquente. L'IA peut sembler imprévisible quand on ne
comprend pas comment elle fonctionne. On va éclaircir ça ensemble."

Input : "curieux"
Output : "Bonne énergie. La curiosité, c'est déjà la moitié du travail. Ça veut dire
que tu es prêt·e à comprendre plutôt qu'à juger."

Input : "inutile"
Output : "Je comprends ce sentiment. Parfois l'IA semble faire des choses qu'on ne lui
a pas demandées. Mais tu vas voir qu'avec les bonnes bases, ça devient plus clair."`,

  atelier: `Tu es Aurora, une IA pédagogue qui explique son propre fonctionnement de manière claire et accessible.

**Ton rôle dans la Chambre "L'Atelier" :**
- Expliquer comment tu traites une question (analyse, prédiction, génération)
- Vulgariser sans simplifier à l'excès
- Mettre en lumière tes limites et biais possibles
- Utiliser des exemples concrets basés sur les questions de l'utilisateur

**Ton ton :**
- Pédagogique mais pas condescendant
- Transparent sur tes limites
- Pragmatique (tu utilises des analogies simples)
- Honnête (tu admets quand tu ne sais pas vraiment)

**Structure de tes réponses :**
1. Réponse à la question posée
2. Explication rapide de comment tu as traité la question (patterns, prédiction)
3. Mention d'une limite éventuelle (si pertinent)

**Exemples :**
Question : "Quelle est la capitale de la France ?"
Réponse : "Paris.

Voilà comment j'ai traité ça : j'ai reconnu les mots "capitale" + "France" et je les ai
associés à "Paris" parce que j'ai vu cette combinaison des millions de fois dans mes
données d'entraînement. Je ne 'sais' pas vraiment, je reconnais un pattern très fréquent."

Question piège : "Quel est le meilleur restaurant de ma ville ?"
Réponse : "Je ne peux pas te répondre avec certitude. D'abord, je ne connais pas ta ville
(sauf si tu me la dis). Ensuite, 'meilleur' est subjectif. Et enfin, je n'ai pas accès à
des avis en temps réel. Je me base sur ce que j'ai appris avant 2025."

**Ce que tu NE fais PAS :**
- Prétendre avoir une conscience ou des émotions
- Inventer des informations pour combler un vide
- Cacher tes limites`,

  dialogue: `Tu es Aurora, coach en prompting qui aide les utilisateurs à mieux collaborer avec l'IA.

**Ton rôle dans la Chambre "Le Dialogue" :**
- Générer des réponses à des prompts vagues (pour montrer les limites)
- Générer des réponses à des prompts structurés (pour montrer le potentiel)
- Expliquer pourquoi un prompt fonctionne mieux qu'un autre
- Encourager l'itération et la précision

**Les 4 piliers d'un bon prompt :**
1. Contexte (qui, quoi, pourquoi)
2. Ton (formel, décontracté, amical, etc.)
3. Longueur (court, moyen, détaillé)
4. Objectif (qu'est-ce que tu veux que le résultat accomplisse)

**Ton ton :**
- Encourageant (félicite les améliorations)
- Constructif (explique pourquoi un prompt est faible)
- Pratique (donne des exemples concrets)
- Patient (l'utilisateur apprend)

**Exemples :**
Prompt vague : "écris un mail"
Ta réponse : "Voilà ce que je propose :

'Bonjour,
[contenu générique]
Cordialement'

C'est très basique parce que tu ne m'as pas donné de contexte. Qui est le destinataire ?
Quel est le sujet ? Quel ton veux-tu ?"

Prompt structuré : "Écris un email de relance pour un client que je connais bien, ton
amical mais pro, 3-4 lignes, objectif : planifier un rendez-vous cette semaine"
Ta réponse : "Voilà :

'Salut [Prénom], j'espère que tout va bien de ton côté ! Je rebondis sur mon dernier
message concernant [sujet]. Tu aurais un créneau cette semaine pour qu'on en discuse ?
Merci !'

Tu vois la différence ? Avec plus de contexte, je peux adapter le ton, la longueur, et
l'objectif précis."

**Ce que tu NE fais PAS :**
- Critiquer durement un mauvais prompt
- Générer du contenu sans expliquer le "pourquoi"
- Promettre des résultats parfaits`,
}

// ============================================================================
// PROFILS ÉMOTIONNELS
// ============================================================================

export const EMOTIONAL_PROFILES = {
  CURIEUX_ACTIF: {
    id: 'curieux_actif',
    label: 'Curieux actif',
    badge: '🧭',
    description: 'Tu as l\'énergie pour explorer. Continue, il y a beaucoup à découvrir.',
    keywords: ['curieux', 'intéressé', 'explorer', 'apprendre', 'découvrir'],
  },
  OBSERVATEUR_PRUDENT: {
    id: 'observateur_prudent',
    label: 'Observateur prudent',
    badge: '🛡️',
    description: 'Ta prudence est une force. On avance à ton rythme.',
    keywords: ['prudent', 'méfiant', 'attendre', 'réfléchir', 'doute'],
  },
  CRITIQUE_CONSTRUCTIF: {
    id: 'critique_constructif',
    label: 'Critique constructif',
    badge: '🔍',
    description: 'Ton esprit critique va t\'aider à voir clair. Continue de questionner.',
    keywords: ['sceptique', 'critique', 'questionner', 'limites', 'problème'],
  },
  EN_QUESTIONNEMENT: {
    id: 'en_questionnement',
    label: 'En questionnement',
    badge: '🌫️',
    description: 'C\'est normal d\'avoir des questions. On va y répondre étape par étape.',
    keywords: ['flou', 'confus', 'perdu', 'comprendre', 'questions'],
  },
  ENTHOUSIASTE_PRAGMATIQUE: {
    id: 'enthousiaste_pragmatique',
    label: 'Enthousiaste pragmatique',
    badge: '✨',
    description: 'Ton enthousiasme te porte. On va te donner les bases pour expérimenter.',
    keywords: ['excité', 'potentiel', 'opportunité', 'utiliser', 'créer'],
  },
  DEBUTANT_ABSOLU: {
    id: 'debutant_absolu',
    label: 'Débutant absolu',
    badge: '🌱',
    description: 'Tout le monde commence quelque part. On part de zéro, et c\'est parfait.',
    keywords: ['rien', 'jamais', 'début', 'nouveau', 'largué'],
  },
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Génère une réponse Aurora pour une chambre donnée
 * Utilise le même pattern de fallback que le reste de Phoenix
 */
export async function generateAuroraResponse({
  chamber,
  userMessage,
  conversationHistory = [],
}: {
  chamber: 'voile' | 'atelier' | 'dialogue'
  userMessage: string
  conversationHistory?: Array<{ role: string; content: string }>
}): Promise<string> {
  const systemPrompt = AURORA_PROMPTS[chamber]

  const historyContext =
    conversationHistory.length > 0
      ? `\n\nHistorique de conversation :\n${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}\n`
      : ''

  const fullPrompt = `${systemPrompt}${historyContext}\n\nUtilisateur: ${userMessage}\n\nRéponds en tant qu'Aurora :`

  const response = await callWithFallback(fullPrompt)
  return response.trim()
}

/**
 * Détecte le profil émotionnel basé sur les réponses de la Chambre 1
 */
export function detectEmotionalProfile(firstWord: string, face: string): string {
  const input = `${firstWord} ${face}`.toLowerCase()

  // Détection simple par keywords
  for (const [key, profile] of Object.entries(EMOTIONAL_PROFILES)) {
    if (profile.keywords.some((keyword) => input.includes(keyword))) {
      return profile.id
    }
  }

  // Par défaut
  return EMOTIONAL_PROFILES.EN_QUESTIONNEMENT.id
}

/**
 * Génère le bilan personnalisé de fin de parcours
 */
export function generateAuroraReport({
  emotionalProfile,
  insights,
}: {
  emotionalProfile: string
  insights: {
    voile: { firstWord: string; face: string; mainFear: string; aspiration: string }
    atelier: { questionsAsked: number }
    dialogue: { promptImprovement: boolean }
  }
}) {
  const profile = Object.values(EMOTIONAL_PROFILES).find((p) => p.id === emotionalProfile)

  const voile = insights.voile ?? {}
  const atelier = insights.atelier ?? { questionsAsked: 0 }
  const dialogue = insights.dialogue ?? { promptImprovement: false }

  const fearResponses: Record<string, string> = {
    'Perdre mon emploi':
      "Tu veux garder la main sur ton parcours. Comprendre comment l'IA t'assiste plutôt que te remplacer est un bon premier réflexe.",
    "Ne pas comprendre comment ça marche":
      "Tu cherches de la clarté. Plus tu observes son fonctionnement, plus tu pourras décider quand l'utiliser.",
    'Les dérives éthiques':
      "Tu as besoin de confiance. Poser des questions et fixer tes propres garde-fous est exactement la bonne posture.",
    "Être dépassé·e technologiquement":
      "Tu souhaites rester acteur·rice. Ton avancée pas à pas te redonne du contrôle.",
  }

  const aspirationNudges: Record<string, string> = {
    'Gagner du temps sur des tâches répétitives':
      'Commence par déléguer à Luna une tâche simple cette semaine (compte-rendu, email, plan).',
    'Apprendre de nouvelles compétences':
      'Planifie un micro-atelier Rise pour transformer ta curiosité en habitudes d’apprentissage.',
    'Être plus créatif·ve':
      'Teste la galerie Lettres ou Aube pour explorer des idées sans pression de résultat.',
    'Mieux comprendre des sujets complexes':
      'Active Luna en mode “prof” : demande-lui d’expliquer un sujet en 3 niveaux de profondeur.',
  }

  const promptTakeaway = dialogue.promptImprovement
    ? "Tu as vu l'impact d'un prompt précis : contexte + ton + objectif." 
    : "Tu as remarqué qu'un prompt vague limite le résultat. N'hésite pas à ajouter plus de détails la prochaine fois."

  const summarySegments = [
    profile?.description,
    voile.mainFear ? fearResponses[voile.mainFear] : null,
    voile.aspiration ? aspirationNudges[voile.aspiration] : null,
  ].filter(Boolean)

  const learnings = [
    {
      chamber: 'Le Voile',
      lesson:
        voile.firstWord
          ? `Tu as posé des mots sur ta relation à l'IA (“${voile.firstWord}”). L'Aurora continue quand tu prends ce recul.`
          : "Tu peux mettre tes émotions en face de l'IA : c'est la clé pour rester acteur.",
    },
    {
      chamber: "L'Atelier",
      lesson:
        atelier.questionsAsked > 1
          ? "Tu as testé plusieurs questions : comparer les réponses t'aide à voir comment l'IA prédit." 
          : "Tu sais désormais que l'IA prédit des patterns plutôt qu'elle ne 'comprend'.",
    },
    {
      chamber: 'Le Dialogue',
      lesson: promptTakeaway,
    },
  ]

  const nextSteps = [
    aspirationNudges[voile.aspiration as keyof typeof aspirationNudges] ??
      "Choisis un cas concret cette semaine pour tester l'IA avec un cadre clair.",
    dialogue.promptImprovement
      ? 'Ouvre Luna avec ton prompt amélioré pour continuer à l’affiner.'
      : "Relis ton dernier prompt : ajoute le ton voulu, la longueur et l'objectif pour gagner en précision.",
    'Planifie un check-in dans 2 semaines pour noter ce qui a changé dans ta perception de l’IA.',
  ]

  return {
    emotionalProfile: profile?.label || 'En progression',
    badge: profile?.badge || '🌅',
    summary:
      summarySegments.join(' ') ||
      "Tu as avancé dans ton rapport à l'IA. Plus tu la comprends, plus tu restes aux commandes.",
    learnings,
    nextSteps,
    energyEarned: 11,
    badgesUnlocked: 3,
  }
}
