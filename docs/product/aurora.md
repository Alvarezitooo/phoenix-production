# Aurora — Portail d'Acculturation IA

## 🌅 Vue d'ensemble

Aurora est le 7ème portail de Phoenix-Luna, conçu pour démystifier l'intelligence artificielle auprès du grand public. C'est un parcours empathique et pédagogique de 20 minutes qui permet à chacun de comprendre l'IA, ses mécanismes, et d'apprendre à collaborer efficacement avec elle.

**Alignement stratégique :** Région Sud - Terre d'IA (démocratisation + souveraineté)

---

## 🏗️ Architecture technique

### Stack utilisée

- **Frontend** : Next.js 15, React 19, TypeScript, Tailwind v4
- **Backend** : API Routes Next.js
- **Base de données** : PostgreSQL + Prisma ORM
- **IA** : Gemini/OpenAI (avec fallback automatique via `callWithFallback`)
- **Analytics** : Extension enum `AnalyticsEventType` existant
- **Énergie** : Système `creditEnergy`/`spendEnergy` déjà en place

### Réutilisation maximale

Aurora réutilise 80% de l'infra Phoenix existante :
- Authentification (NextAuth)
- Layout dashboard
- Système d'énergie
- Analytics
- UI components (Card, Button, etc.)

---

## 📋 Structure de la base de données

### Table `AuroraSession`

```prisma
model AuroraSession {
  id               String    @id @default(cuid())
  userId           String
  currentChamber   Int       @default(0)      // 0=Voile, 1=Atelier, 2=Dialogue
  dialogue         Json      @default("[]")   // Historique conversations
  insights         Json?                       // Données collectées par chambre
  emotionalProfile String?                     // Profil final détecté
  completedAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([completedAt])
}
```

### Analytics Events ajoutés

```prisma
enum AnalyticsEventType {
  // ... existing
  AURORA_STARTED
  AURORA_VOILE_COMPLETED
  AURORA_ATELIER_COMPLETED
  AURORA_DIALOGUE_COMPLETED
  AURORA_COMPLETED
  AURORA_PROFILE_GENERATED
}
```

---

## 🎨 Les 3 Chambres

### Chambre 1 : Le Voile (5-7 min)
**Objectif** : Identifier le ressenti émotionnel face à l'IA

**Flow** :
1. Question ouverte : "Quel mot te vient quand tu penses à l'IA ?"
2. Reformulation empathique par Aurora (IA)
3. Métaphore : "L'IA a un visage, c'est quoi ?"
4. Choix multiples : principale crainte
5. Choix multiples : aspiration si l'IA devenait alliée
6. Synthèse → profil émotionnel généré

**Profils possibles** :
- Curieux actif 🧭
- Observateur prudent 🛡️
- Critique constructif 🔍
- En questionnement 🌫️
- Enthousiaste pragmatique ✨
- Débutant absolu 🌱

**Récompense** : +3 points d'énergie

---

### Chambre 2 : L'Atelier (7-8 min)
**Objectif** : Comprendre comment une IA fonctionne (vulgarisation)

**Flow** :
1. L'utilisateur pose une question simple à Aurora
2. Aurora répond ET explique son processus (analyse → patterns → prédiction → génération)
3. L'utilisateur pose une question piège/difficile
4. Aurora explique ses limites (hallucinations, biais, données d'entraînement)
5. Synthèse : Les 3 règles de l'IA

**Les 3 règles** :
1. L'IA prédit, elle ne comprend pas vraiment
2. L'IA reflète ses données d'entraînement
3. L'IA ne vérifie pas ses sources en temps réel

**Récompense** : Badge "Observateur éclairé" 🔍 + 3 points d'énergie

---

### Chambre 3 : Le Dialogue (8-10 min)
**Objectif** : Apprendre à prompting efficace (collaboration avec l'IA)

**Flow** :
1. Mission pratique : "Aide-moi à rédiger un email de relance client"
2. Premier essai avec prompt vague → résultat médiocre
3. Aurora coach les 4 piliers du bon prompt (contexte, ton, longueur, objectif)
4. Deuxième essai avec prompt structuré → résultat excellent
5. Synthèse : Les 3 règles du bon prompt

**Les 3 règles** :
1. Sois précis (contexte++)
2. Itère (reformule si besoin)
3. Reste critique (vérifie toujours)

**Récompense** : Badge "Apprenti prompt" 💬 + 5 points d'énergie

---

## 🔌 API Routes

### `POST /api/aurora/session`
Crée ou récupère la session Aurora active de l'utilisateur.

**Response** :
```json
{
  "session": {
    "id": "cuid",
    "currentChamber": 0,
    "dialogue": [],
    "insights": null,
    "completedAt": null
  }
}
```

---

### `POST /api/aurora/interact`
Envoie un message utilisateur et reçoit la réponse IA.

**Request** :
```json
{
  "sessionId": "cuid",
  "userMessage": "peur",
  "chamber": "voile",
  "context": { "firstWord": "peur" }
}
```

**Response** :
```json
{
  "aiResponse": "C'est une réaction fréquente. L'IA peut sembler imprévisible...",
  "shouldAdvance": false
}
```

---

### `POST /api/aurora/advance`
Avance l'utilisateur à la chambre suivante.

**Request** :
```json
{
  "sessionId": "cuid",
  "toChamber": 1
}
```

**Response** :
```json
{
  "currentChamber": 1,
  "energyEarned": 3
}
```

---

### `POST /api/aurora/complete`
Finalise la session et génère le bilan personnalisé.

**Request** :
```json
{
  "sessionId": "cuid"
}
```

**Response** :
```json
{
  "report": {
    "emotionalProfile": "Curieux actif",
    "badge": "🧭",
    "summary": "Tu n'es ni pour, ni contre l'IA...",
    "learnings": [...],
    "nextSteps": [...],
    "energyEarned": 11,
    "badgesUnlocked": 3
  }
}
```

---

## 🎯 Prompts IA (src/lib/aurora.ts)

Aurora utilise 3 prompts système distincts (un par chambre) :

### Ton général Aurora
- **Chaleureux mais factuel** (pas mystique)
- **Empathique mais réaliste** (admet les limites)
- **Pédagogique sans condescendance**
- **Direct et clair** (pas de métaphores poétiques)
- **Conversationnel** (tutoiement)

### Pattern de génération
```typescript
const response = await callWithFallback(fullPrompt)
```

Réutilise le système de fallback Gemini → OpenAI déjà en place dans Phoenix.

---

## 🎨 Composants UI

### `<AuroraJourney />` (Orchestrateur principal)
- Gère l'état global de la session
- Progress bar (3 chambres)
- Navigation entre chambres
- Affichage du rapport final

### `<AuroraVoile />` (Chambre 1)
- Chat conversationnel
- Inputs texte + boutons choix multiples
- 4 étapes progressives
- Détection profil émotionnel

### `<AuroraAtelier />` (Chambre 2)
- Chat conversationnel
- 2 questions min
- Affichage des 3 règles de l'IA

### `<AuroraDialogue />` (Chambre 3)
- Chat conversationnel
- Exercice pratique prompting
- Comparaison prompt vague vs structuré

### `<AuroraReport />` (Bilan final)
- Profil émotionnel + badge
- Résumé des apprentissages
- Prochains pas suggérés
- Énergie totale gagnée (+11)

---

## 📊 Analytics & Métriques

### Events trackés
- `AURORA_STARTED` : Création session
- `AURORA_VOILE_COMPLETED` : Fin Chambre 1
- `AURORA_ATELIER_COMPLETED` : Fin Chambre 2
- `AURORA_DIALOGUE_COMPLETED` : Fin Chambre 3
- `AURORA_COMPLETED` : Parcours terminé
- `AURORA_PROFILE_GENERATED` : Profil généré

### KPIs à suivre
- **Taux de complétion** : % qui terminent les 3 chambres
- **Temps moyen** : Durée totale parcours
- **Distribution profils** : Quels profils émotionnels dominent
- **Énergie dépensée/gagnée** : Aurora est gratuit (+11 énergie)
- **Utilisation post-Aurora** : Combien utilisent Luna/CV/Letters après

---

## ⚡ Système d'énergie

### Récompenses
- Chambre 1 (Voile) : **+3 énergie**
- Chambre 2 (Atelier) : **+3 énergie**
- Chambre 3 (Dialogue) : **+5 énergie**
- **Total** : **+11 points d'énergie**

### Coût
Aurora est **100% gratuit** (stratégie d'acquisition + mission sociétale).

---

## 🚀 Déploiement

### Prérequis
1. Migration Prisma appliquée (`prisma migrate deploy`)
2. Variables d'env IA configurées (OPENAI_API_KEY ou GOOGLE_GENERATIVE_API_KEY)

### Commandes
```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer la migration
npm run prisma:migrate

# Build
npm run build

# Démarrer
npm run start
```

### Vérifications post-déploiement
- [ ] `/aurora` accessible
- [ ] Sessions créées dans DB
- [ ] Analytics events loggés
- [ ] Énergie créditée (+11)
- [ ] Dashboard affiche Aurora complété

---

## 🧪 Tests

### Tests manuels essentiels
1. **Parcours complet** : Les 3 chambres + bilan
2. **Sauvegarde session** : Fermer/rouvrir → reprend où on était
3. **IA responsive** : Prompts vagues vs structurés donnent résultats différents
4. **Analytics** : Events loggés dans DB
5. **Énergie** : +11 points après complétion
6. **Dashboard** : Card Aurora marquée "complété"

### Edge cases
- Session abandonnée (ne crédite pas l'énergie)
- Multiples sessions (seule la dernière compte)
- IA timeout (fallback message d'erreur)

---

## 📈 Roadmap future (post-MVP)

### Phase 2 (Q1 2026)
- Migration vers **Mistral API** (souveraineté EU)
- Export PDF du bilan
- Modules thématiques payants :
  - "IA & Créativité" (+3 énergies)
  - "IA & Emploi" (+3 énergies)
  - "IA & Éthique" (+3 énergies)

### Phase 3 (Q2 2026)
- Version standalone "Aurora App"
- Intégration Luna (chatbot Aurora dédié)
- Labellisation "Espace Sud IA"

### Phase 4 (Q3 2026)
- Offre B2B collectivités
- Déploiement médiathèques/lycées/tiers-lieux
- Aurora avec **Ollama local** (full souverain)

---

## 🤝 Alignement Sud Terre d'IA

### Critères remplis
✅ **Démocratisation** : Accès gratuit, langage simple, 20 min
✅ **Pédagogie** : 3 chambres progressives, bilan personnalisé
✅ **Souveraineté** : Mistral API (roadmap)
✅ **Ancrage régional** : PACA first, puis national
✅ **Mesurable** : Analytics complètes
✅ **Scalable** : B2C → B2B collectivités

### Arguments pitch TVT Innovation
1. **Problème** : Fracture numérique face à l'IA (peur, incompréhension)
2. **Solution** : TryHackMe du grand public, empathique et accessible
3. **Traction** : Intégré dans Phoenix (base utilisateurs existante)
4. **Impact** : Contribue au plan régional Sud Terre d'IA
5. **Vision** : De l'app gratuite aux licences collectivités (2026)

---

## 📝 Notes techniques

### Choix d'implémentation
- **Pas de Supabase** : Tout dans Prisma/PostgreSQL Phoenix
- **Pas de FastAPI** : Tout dans Next.js API routes
- **Pas d'Ollama (MVP)** : Gemini/OpenAI suffisent pour valider le concept

### Dépendances
Aurora n'ajoute **aucune dépendance npm** nouvelle. Réutilise 100% de l'existant.

### Performance
- **Latence IA** : ~2-4s par réponse (Gemini)
- **Session size** : ~5-10kb JSON (dialogue + insights)
- **Analytics** : 6 events par parcours complet

---

## 🐛 Troubleshooting

### Problème : IA ne répond pas
**Cause** : Clés API manquantes ou quotas dépassés
**Solution** : Vérifier `OPENAI_API_KEY` et `GOOGLE_GENERATIVE_API_KEY` dans `.env`

### Problème : Énergie non créditée
**Cause** : Session non complétée jusqu'au bout
**Solution** : Vérifier que `completedAt` est renseigné dans `AuroraSession`

### Problème : Dashboard n'affiche pas Aurora
**Cause** : Migration non appliquée ou snapshot non refresh
**Solution** : `npx prisma migrate deploy` et recharger la page

---

## ✅ Checklist de validation

- [x] Migration Prisma créée
- [x] API routes fonctionnelles
- [x] Composants UI créés
- [x] Intégration dashboard
- [x] Prompts IA finalisés
- [x] Analytics events ajoutés
- [x] Système d'énergie intégré
- [ ] Tests E2E (à faire)
- [ ] Déploiement staging (à faire)
- [ ] Validation utilisateurs beta (à faire)

---

**Créé par** : Claude (Assistant IA)
**Date** : Octobre 2025
**Pour** : Matthieu Rubia - Phoenix-Luna
**Contexte** : Préparation pitch TVT Innovation 23/10
