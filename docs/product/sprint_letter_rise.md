# Sprint Letter & Rise — Plan fonctionnel

## Contexte
- **Équipe** : Phoenix·Luna (2 personnes)
- **Objectifs sprint**
  - Remplacer l’actuel générateur de lettres par une expérience narrative complète : miroir empathique, rune de verbe, galerie partagée.
  - Préparer la couche Rise (Phase Réalisation) pour enchaîner après Aube & Letter.
  - Garder le fil conducteur "énergie" et alimenter les KPIs engagement/monétisation.

---

## 1. Portail Letter (Expansion)

### 1.1 Parcours utilisateur
1. **Brief** (non authentifié) : teaser sur /letters (hero + CTA « Entrer dans Letter ») → redirection vers `/letters` (auth requise).
2. **Studio Letter** (nouveau layout en 3 colonnes) :
   - Colonne contexte : matches Aube, résumé CV, historique lettres, énergie actuelle (`useEnergySnapshot`).
   - Colonne centrale « Miroir » :
     1. `LetterMirror` (IA miroir empathique) → transforme le brief en reflet lexical (ton empathique, highlight lexique). Consomme 0 énergie (bonus/streak).
     2. `LetterRune` (badge animé) → calcule la “rune” dominante selon verbe/action (e.g., **Ancrer**, **Révéler**, **Propulser**). Débloquée après miroir.
   - Colonne droite « Rédaction » : Éditeur Markdown guidé (sections ancrées), suggestion live (hooks, arguments).
3. **Rituels Letter** : checklist micro-actions (mise en voix, feedback pair, envoi) → déclenche `creditEnergy` si complétés.
4. **Partage** : export PDF/Markdown + publication anonyme (après modération) dans galerie.

### 1.2 IA miroir empathique
- **API** : `POST /api/letters/mirror`
  - Input : `jobTitle`, `company`, `tone`, `resumeSummary`, `highlights`.
  - Output : `mirrorText`, `keywords[]`, `emotionalSpectrum` (3 valeurs), `suggestedRune`.
- **Prompt** : s’appuie sur Gemini (verbatim empathique), renvoie JSON.
- **UI** : bloc card animé (framer-motion) avec surlignage (keywords), slider tonalité.
- **Instrumentation** : `AnalyticsEventType.LETTER_MIRROR_REQUESTED` (à ajouter) + `ENERGY_SPENT` (si on décide de facturer +1 énergie). Pour sprint, miroir gratuit mais lié à streak (mécanique “3 miroirs ≈ rune rare”).

### 1.3 Rune de verbe
- **Concept** : 5 runes (Révéler, Ancrer, Propulser, Éclairer, Aligner).
- **Déblocage** : `suggestedRune` renvoyé par /mirror. UI -> badge animé (SVG + glow) affiché sur carte.
- **Persistant** : champ `rune` sur `LetterDraft` (migration).
- **Analytics** : déclencher `LETTER_RUNE_UNLOCKED` avec `metadata` (`rune`, `mirrorKeywords`).

### 1.4 Galerie anonyme + rappel J+7
- **Base de données** : nouvelle table `LetterPublication` (id, draftId, userId, rune, excerpt, status, publishedAt, isAnonymous, likesCount, flagsCount).
- **Flow** :
  1. Auteur valide brouillon → `POST /api/letters/publish` (crée entrée `PENDING`, consomme 1 énergie pour “offrir” la lettre).
  2. Moderation tool (admin) -> `PATCH` statut `APPROVED`/`REJECTED`.
  3. `/letters/gallery` : liste cards anonymes, filtre par rune.
- **Rappel J+7** : worker (cron) `letters_reminder` → emails via Resend/Sendgrid. Condition : `letterDraft.updatedAt >= 7j` & non publié → envoie `LETTER_REMINDER`.
- **Feed Constellation** : event store `ConstellationEvent` pour lettres publiées, badge Rise, packs achetés, Aube complété.
- **Parrainage** : `/api/referrals/link` (génère code) + `/api/referrals/claim` (bonus énergie, analytics `REFERRAL_BONUS_GRANTED`).
- **CV Aube (Sprint 7)** : `/api/cv` génère le CV narratif (analytics `CV_GENERATED`), `/api/cv/drafts/[id]/share` active le profil public (`/cv/share/{slug}`) avec thème énergétique aligné sur Aube.
- **Instrumentation** : `AnalyticsEventType.LETTER_PUBLISHED`, `LETTER_REMINDER_SENT` (à ajouter). KPIs conversion publication & retour J+7.

### 1.5 Guided editor & suggestions
- Migrer `LetterGenerator` → composant `LetterStudio` :
  - `LetterBriefForm` (React Hook Form).
  - `LetterMirror` & `LetterRuneBadge`.
  - `LetterEditor` (Markdown → preview). Ajouter suggestions en marge (chips cliquables).
  - Ajout d’un mode “IA refine” : `POST /api/letters/refine` (input current letter + directive) → propose diff (use-case “réduire 20%”, “ton plus executive”).
- Intégration `EnergyMeter` mini pour rappeler coût (`letters.generate` = 3).
- Notification toast quand rune rare (ex: Propulser) => +1 énergie bonus via `creditEnergy` (optionnel, 10% chance).

### 1.6 Données & migrations
- Prisma :
  - `model LetterDraft` → ajouter `rune`, `mirror`, `published` relation.
  - `model LetterPublication` (voir supra).
- Migration : `prisma/migrations/20250220162000_letter_expansion`.
- Seed rune mapping (config).

### 1.7 Analytics à prévoir
| Event | Quand | Metadata |
| --- | --- | --- |
| `LETTER_MIRROR_REQUESTED` | POST /letters/mirror | `tone`, `rune`, `keywords[]` |
| `LETTER_RUNE_UNLOCKED` | Mirror → rune | `rune`, `mirrorIntensity` |
| `LETTER_EDITOR_REFINED` | POST /letters/refine | `directive`, `deltaChars` |
| `LETTER_PUBLISHED` | Après approbation | `rune`, `isAnonymous` |
| `LETTER_REMINDER_SENT` | Cron J+7 | `draftId`, `channel` |
| `LETTER_GALLERY_VIEW` | User visite /gallery | `filters` |

---

## 2. Portail Rise (Éclipse → Réalisation)

### 2.1 Parcours cible
1. **Landing Rise** : hero “7 quêtes pour activer ton énergie”. CTA vers `RiseMissions`.
2. **Missions** : 7 cartes (ex : “Clarifier ton projet”, “Pitch 90s”, “Rituel gratitude pro”). Chaque mission = checklist (3 micro-actions) + récompense énergie.
3. **Tracker énergie active** : auto-déclaration (points bonus quand mission done) + auto-détection via `spendEnergy` sur modules.
4. **Feedback Luna** : `POST /api/rise/coach` → analyse notes + propose feedback (énergie action vs doute).
5. **Journal victoires** : timeline + graphe énergie (line chart). Option export PDF.
6. **Rituel de passage** : une fois 5 missions réussies → défi symbolique (50 pts d’énergie, rune spéciale “Constellation”).
7. **Badge constellation** : synchronie simple (affiché sur dashboard + profil).

### 2.2 Structures données
- `RiseMission` (config TS) : id, titre, description, energyReward, prerequisites.
- Prisma :
  - Table `RiseMissionProgress` (userId, missionId, status, completedAt, energyAwarded).
  - Table `RiseVictory` (journal entrées + énergie perçue).
  - Ajout `actionEnergy`/`doubtEnergy` sur `RiseSession` ou table dérivée.

### 2.3 API additions
- `GET /api/rise/missions` : mission states + énergie.
- `POST /api/rise/missions/:id/complete` : enregistre statut, crédite énergie (utilise `creditEnergy`). Log `AnalyticsEventType.RISE_MISSION_COMPLETED` (nouvelle valeur enum).
- `POST /api/rise/feedback` : IA résume notes & donne axes progression.
- `GET /api/rise/victories` + `POST` : CRUD journal.
- `POST /api/rise/passage` : valide rituel, délivre badge, log `AnalyticsEventType.RISE_PASSAGE_UNLOCKED`.

### 2.4 UI/UX
- `RiseDashboard` composant (cards missions + progress bar).
- `RiseEnergyTracker` (line chart + `EnergyMeter`).
- `RiseVictoriesTimeline` (list + add form).
- `RiseConstellationBadge` (SVG animé, réutilise `EnergyMeter` glow classes).
- Intégration toasts (success, passage unlocked).

### 2.5 Analytics Rise
| Event | Metadata |
| --- | --- |
| `RISE_MISSION_COMPLETED` | `missionId`, `rewardEnergy` |
| `RISE_FEEDBACK_REQUESTED` | `notesCount`, `focus` |
| `RISE_VICTORY_ADDED` | `energyDelta` |
| `RISE_PASSAGE_UNLOCKED` | `missionsCompleted`, `badge` |
| `RISE_BADGE_VIEWED` | user ouvre badge UI |

### 2.6 KPI cibles
- % utilisateurs Aube → mission Rise 1.
- Temps moyen entre mission 1 et 5.
- Énergie active gagnée vs dépensée (missions vs modules IA).
- Taux de complétion rituel passage.

---

## 3. Roadmap & dépendances

### 3.1 Stories principales (Letter)
1. `LETTER-01` — API `POST /api/letters/mirror` (Gemini fallback, instrumentation).
2. `LETTER-02` — Migration `LetterDraft` (rune, mirror payload) + rune config.
3. `LETTER-03` — UI `LetterStudio` (mirror + rune + guided editor).
4. `LETTER-04` — Publication galerie + modération + rappel J+7.
5. `LETTER-05` — IA refine + instrumentation.
6. `LETTER-06` — Tests E2E (flow mirror → publication).

### 3.2 Stories principales (Rise)
1. `RISE-01` — Config missions & Prisma `RiseMissionProgress`.
2. `RISE-02` — API missions (GET, POST complete) + énergie reward.
3. `RISE-03` — UI `RiseDashboard` (cards + progress bar + streak).
4. `RISE-04` — Journal victoires + graphique.
5. `RISE-05` — Rituel passage + badge + analytics.
6. `RISE-06` — Feedback IA & tracker énergie d’action.

### 3.3 Dépendances
- **Infra** : Cron/worker (Planetscale? Supabase? adapt) pour rappel J+7 + purge modération.
- **Design** : assets runes + badge constellation (Figma -> export).
- **Data** : Ajout nouveaux enums `AnalyticsEventType` (LETTER / RISE) via migration.
- **Legal** : Galerie anonyme → vérifier CGU & consentement publication.

### 3.4 Tests & QA
- Tests unitaires sur `buildLetterRune()` (mapping mots-clés → rune).
- Tests intégration `letters/mirror` (mock AI provider).
- Tests Playwright : Mirror → Rune → Export, Mission complete → énergie augmente, Rituel passage.
- QA : accessibilité (tab order), mobile layout (3 colonnes collapsées).

---

## 4. Suivi & KPIs
- Exposer nouvelles vues analytics (dépend de dashboard KPI) : `LETTER_MIRROR_REQUESTED`, `RISE_MISSION_COMPLETED`.
- Metabase : dashboard “Expansion Letter & Rise”.
- Rituels d’analyse hebdo : check conversion Aube → Letter → Rise.

---

## 5. Prochaines étapes immédiates
1. Valider mapping des runes avec équipe contenu (liste verbs + palette).
2. Intégrer nouveaux types `AnalyticsEventType` (mirror, mission, passage).
3. Découper stories dev (Letter d’abord, mission Rise ensuite) et calibrer charges.
