# Aurora — Quick Start Guide

## 🚀 Démarrage rapide (5 étapes)

### 1. Appliquer la migration Prisma

```bash
npx prisma migrate dev --name aurora_portal
# ou en production
npx prisma migrate deploy
```

### 2. Générer le client Prisma

```bash
npm run prisma:generate
```

### 3. Vérifier les variables d'environnement

Assure-toi d'avoir au moins une de ces clés IA :

```env
OPENAI_API_KEY=sk-...
# OU
GOOGLE_GENERATIVE_API_KEY=AI...
```

### 4. Lancer le serveur

```bash
npm run dev
```

### 5. Tester Aurora

1. Ouvre `http://localhost:3000/dashboard`
2. Clique sur la card **Aurora**
3. Commence le parcours (3 chambres)
4. Vérifie que tu reçois +11 points d'énergie à la fin

---

## 🧪 Tests rapides

### Test 1 : Session créée
```bash
# Dans Prisma Studio
npx prisma studio
# Vérifie table AuroraSession
```

### Test 2 : Analytics loggés
```sql
SELECT * FROM "AnalyticsEvent"
WHERE type LIKE 'AURORA%'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Test 3 : Énergie créditée
```sql
SELECT * FROM "EnergyTransaction"
WHERE reference LIKE 'aurora%'
ORDER BY "createdAt" DESC
LIMIT 5;
```

---

## 🐛 Debug rapide

### Problème : "Session not found"
→ Vérifie que `sessionId` est valide dans la requête

### Problème : IA timeout
→ Vérifie les clés API dans `.env`

### Problème : Dashboard n'affiche pas Aurora
→ Recharge la page (le snapshot est calculé côté serveur)

---

## 📝 Prochaines étapes

- [ ] Tester avec de vrais utilisateurs
- [ ] Collecter feedback sur les prompts IA
- [ ] Ajuster le ton d'Aurora si besoin
- [ ] Préparer démo pour TVT Innovation (23/10)

---

**Bon test ! 🌅**
