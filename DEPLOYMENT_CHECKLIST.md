# 🚀 Checklist Déploiement Phoenix (Sprint 7 + Aurora)

**Date** : 15 octobre 2025
**Deadline** : 23 octobre 2025 (démo TVT Innovation)
**Status** : ⏳ À exécuter

---

## 📋 Vue d'ensemble

Voici toutes les étapes pour mettre en production :
- ✅ Sprint 7 (CV Share, Constellations, Parrainage, Workers)
- ✅ Aurora (nouveau portail IA)

---

## 1️⃣ Migration Base de Données

### Situation actuelle
- ❌ La DB n'est **pas gérée par Prisma Migrate** (baseline manquante)
- ✅ Le schema Prisma est à jour (Aurora + Sprint7)
- ⚠️ Les anciennes migrations sont dans `prisma/migrations_backup/`

### Action 1.1 : Baseline Prisma Migrate

```bash
# Crée une migration initiale sans exécuter les changements
# (car la DB existe déjà avec les tables)
npx prisma migrate resolve --applied "0_init"
```

**Alternative si ça ne marche pas** :
```bash
# Option 1 : Push direct (sans migrations)
npx prisma db push

# Option 2 : Baseline manuelle
npx prisma migrate dev --name baseline --create-only
# Puis vide le fichier migration.sql (la DB est déjà à jour)
# Puis marque-la comme appliquée
npx prisma migrate resolve --applied baseline
```

### Action 1.2 : Créer migration Aurora + Sprint7

```bash
# Crée la migration pour toutes les nouveautés
npx prisma migrate dev --name sprint7_aurora_complete

# Génère le client Prisma
npm run prisma:generate
```

**Vérification** :
```bash
# Status doit afficher "Database schema is up to date!"
npx prisma migrate status
```

---

## 2️⃣ Vues Analytics (Metabase/Looker)

### Action 2.1 : Appliquer les vues SQL

**Option A : Via psql (si accès direct)** :
```bash
psql "postgresql://postgres:kCmoCoqEWzroZmjZautBHwGxlykXpBPQ@turntable.proxy.rlwy.net:25329/railway" \
  -f sql/analytics/dashboard_views.sql
```

**Option B : Via Prisma Studio** :
```bash
npx prisma studio
# Ouvre l'onglet Query
# Copie-colle le contenu de sql/analytics/dashboard_views.sql
# Execute
```

**Option C : Manuellement via Railway dashboard** :
1. Ouvre Railway → Database → Query
2. Copie le contenu de `sql/analytics/dashboard_views.sql`
3. Exécute

**Vérification** :
```sql
-- Vérifie que le schema analytics existe
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'analytics';

-- Vérifie les vues créées
SELECT table_name FROM information_schema.views WHERE table_schema = 'analytics';
```

**Résultat attendu** :
- `vw_daily_energy_ledger`
- `vw_energy_spend_events`
- `vw_portal_aube`
- `vw_rituals_daily`
- `vw_pack_funnel`
- `vw_user_energy_health`

---

## 3️⃣ Variables d'Environnement

### Action 3.1 : Vérifier .env

**Checklist des variables critiques** :

```bash
# ✅ Déjà configurées
NEXT_PUBLIC_APP_URL=http://localhost:3000  # ⚠️ Changer en prod !
NEXTAUTH_URL=http://localhost:3000         # ⚠️ Changer en prod !
NEXTAUTH_SECRET=dev-secret-change-me       # ⚠️ Changer en prod !

# ✅ IA (au moins 1 requis)
OPENAI_API_KEY=mock-openai-key            # ⚠️ Mettre vraie clé !
GOOGLE_GENERATIVE_API_KEY=mock-gemini-key # ⚠️ Mettre vraie clé !

# ✅ Workers
STREAK_REMINDER_THRESHOLD=3               # ✅ OK
STREAK_REMINDER_BATCH_SIZE=20             # ✅ OK
LETTER_REMINDER_DAYS=7                    # ✅ OK
LETTER_REMINDER_BATCH_SIZE=50             # ✅ OK
RITUAL_REMINDER_BATCH_SIZE=50             # ✅ OK

# ✅ Email (SMTP)
SMTP_HOST=localhost                       # ⚠️ Changer pour prod (Resend/SendGrid)
SMTP_PORT=1025                            # ⚠️ Changer
SMTP_USER=dev                             # ⚠️ Changer
SMTP_PASS=dev                             # ⚠️ Changer
MAILER_FROM="Luna <luna@phoenix.app>"     # ✅ OK

# ✅ Stripe
STRIPE_SECRET_KEY=sk_test_mock            # ⚠️ Mettre vraie clé !
STRIPE_WEBHOOK_SECRET=whsec_mock          # ⚠️ Mettre vraie clé !
```

### Action 3.2 : Configurer pour production

**Variables à ABSOLUMENT changer** :

```env
# Production URLs
NEXT_PUBLIC_APP_URL=https://phoenix.ton-domaine.com
NEXTAUTH_URL=https://phoenix.ton-domaine.com
APP_BASE_URL=https://phoenix.ton-domaine.com

# Sécurité
NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>

# IA (au moins une vraie clé)
OPENAI_API_KEY=sk-proj-...
# OU
GOOGLE_GENERATIVE_API_KEY=AIza...

# Email production (exemple avec Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
MAILER_FROM="Luna <luna@phoenix.ton-domaine.com>"

# Stripe production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 4️⃣ Workers (Cron Jobs)

### Action 4.1 : Tester les workers localement

```bash
# Test rappels lettres (J+7)
npm run worker:letters:reminders

# Test rappels rituels
npm run worker:rituals:reminders

# Test rappels streaks
npm run worker:streak:reminders
```

**Vérifications** :
- [ ] Scripts s'exécutent sans erreur
- [ ] Logs affichent le nombre de notifications envoyées
- [ ] Table `WorkerRun` enregistre l'exécution
- [ ] Emails envoyés (vérifier SMTP ou logs)

### Action 4.2 : Planifier en production

**Option A : Cron system (Linux/Mac)** :
```bash
# Édite le crontab
crontab -e

# Ajoute ces lignes (exemple pour prod)
0 9 * * * cd /path/to/phoenix && npm run worker:letters:reminders
0 10 * * * cd /path/to/phoenix && npm run worker:rituals:reminders
0 8 * * * cd /path/to/phoenix && npm run worker:streak:reminders
```

**Option B : Vercel Cron** (si déployé sur Vercel) :
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/letters-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/rituals-reminders",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/streak-reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Option C : Railway** :
Pas de cron natif → utilise un service externe (GitHub Actions, Render Cron, etc.)

---

## 5️⃣ Tests de Régression

### Action 5.1 : Lancer les tests automatisés

```bash
# Tests unitaires/intégration
npm run test

# Tests E2E (Playwright)
npm run test:e2e
```

**⚠️ Si échecs** : Analyse les logs et corrige avant de déployer

### Action 5.2 : Tests manuels critiques

#### Test 1 : Aurora (nouveau portail)
- [ ] Ouvre `/aurora`
- [ ] Complète les 3 chambres (Voile, Atelier, Dialogue)
- [ ] Vérifie le bilan personnalisé
- [ ] Vérifie +11 points d'énergie créditée
- [ ] Vérifie dashboard marqué "Parcours terminé"

#### Test 2 : CV Share (Sprint 7)
- [ ] Ouvre `/cv-builder`
- [ ] Génère un CV
- [ ] Active le partage public
- [ ] Copie le lien `/cv/share/<slug>`
- [ ] Ouvre le lien en navigation privée (non connecté)
- [ ] Vérifie que le CV s'affiche avec le bon thème

#### Test 3 : Parrainage
- [ ] GET `/api/referrals/link` → reçoit un code unique
- [ ] Partage le lien avec le code
- [ ] Nouveau user s'inscrit avec le code
- [ ] POST `/api/referrals/claim` avec le code
- [ ] Vérifie bonus énergie accordé (parrain + filleul)
- [ ] Vérifie analytics event `REFERRAL_BONUS_GRANTED`

#### Test 4 : Staff Dashboard
- [ ] Ouvre `/staff/dashboard` (si accès admin)
- [ ] Vérifie card "Surveillance énergie"
- [ ] Vérifie card "Constellations" (events récents)
- [ ] Vérifie card "Workers" (dernières exécutions)

#### Test 5 : Constellations
- [ ] Complète Aube → vérifie event `PORTAL_AUBE_COMPLETED`
- [ ] Publie une lettre → vérifie event `LETTER_PUBLISHED`
- [ ] Achète un pack → vérifie event `PACK_PURCHASED`
- [ ] Staff dashboard affiche les events dans la timeline

---

## 6️⃣ Build & Déploiement

### Action 6.1 : Build local

```bash
# Nettoie le cache
rm -rf .next

# Build production
npm run build
```

**Vérifications** :
- [ ] Build réussit sans erreur
- [ ] Pas de warnings critiques
- [ ] Taille des bundles raisonnable

### Action 6.2 : Déployer

**Si Railway** :
```bash
# Push sur main → déploiement auto
git add .
git commit -m "feat: Sprint 7 + Aurora ready for production"
git push origin main
```

**Si Vercel** :
```bash
vercel --prod
```

**Si autre hébergeur** :
```bash
# Sur le serveur
git pull origin main
npm install
npm run build
pm2 restart phoenix  # ou ton process manager
```

---

## 7️⃣ Vérifications Post-Déploiement

### Checklist finale

#### Base de données
- [ ] Migrations appliquées (`npx prisma migrate status`)
- [ ] Vues analytics créées (query `SELECT * FROM analytics.vw_daily_energy_ledger LIMIT 1`)
- [ ] Tables Aurora existent (`AuroraSession`)

#### Fonctionnalités
- [ ] Aurora accessible et fonctionnel
- [ ] CV Share génère des slugs uniques
- [ ] Parrainage crée des codes valides
- [ ] Staff dashboard affiche les données
- [ ] Workers s'exécutent (check `WorkerRun` table)

#### Analytics
- [ ] Events `AURORA_*` loggés
- [ ] Events `CV_GENERATED` loggés
- [ ] Events `REFERRAL_BONUS_GRANTED` loggés
- [ ] Vues SQL retournent des données

#### Monitoring
- [ ] Logs serveur propres (pas d'erreurs critiques)
- [ ] Temps de réponse API <2s
- [ ] Pas de crash sur les pages principales

---

## 🐛 Troubleshooting

### Problème : Migration échoue
**Solution** :
```bash
# Reset si DB de dev
npx prisma migrate reset

# Ou baseline manuelle (prod)
npx prisma db push --force-reset  # ⚠️ DANGER : perte de données !
```

### Problème : Workers ne tournent pas
**Vérifications** :
1. `SMTP_*` configuré correctement
2. Scripts exécutables (`chmod +x scripts/workers/*.ts`)
3. Cron configuré avec bon `PATH` et `NODE_ENV`

### Problème : Vues analytics manquantes
**Solution** :
```bash
# Rejoue le script SQL
psql $DATABASE_URL -f sql/analytics/dashboard_views.sql
```

### Problème : IA ne répond pas (Aurora)
**Vérifications** :
1. `OPENAI_API_KEY` ou `GOOGLE_GENERATIVE_API_KEY` valides
2. Quotas API non dépassés
3. Fallback activé dans `src/lib/ai.ts` (fonction `callWithFallback`)

---

## 📊 Métriques de Succès

### Avant le 23/10 (démo TVT)
- [ ] Aurora testable en production
- [ ] 0 erreur critique en logs
- [ ] Tous les workers exécutés au moins 1x
- [ ] Staff dashboard fonctionnel
- [ ] URL staging partageable

### Post-déploiement (J+7)
- [ ] ≥5 parcours Aurora complétés
- [ ] ≥1 CV partagé publiquement
- [ ] ≥1 parrainage réussi
- [ ] Workers tournent quotidiennement

---

## ✅ Checklist Rapide (Résumé)

```bash
# 1. Migrations
npx prisma migrate dev --name sprint7_aurora
npm run prisma:generate

# 2. Vues analytics
psql $DATABASE_URL -f sql/analytics/dashboard_views.sql

# 3. Tests
npm run test
npm run test:e2e  # si configuré

# 4. Build
npm run build

# 5. Deploy
git push origin main  # ou ta branche de prod

# 6. Vérifications
# → Teste Aurora, CV Share, Parrainage manuellement
```

---

**Prêt pour le 23/10 ! 🚀**

_Créé le 15 octobre 2025 par Claude_
