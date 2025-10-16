# Sprint 8 — Polissage & "Go Live"

**Objectif** : Préparer Phoenix pour la démo TVT Innovation (23/10) et le lancement public
**Durée** : J+7 → J+8 (2 jours)
**Date** : 15-16 octobre 2025

---

## 📋 Vue d'ensemble

Ce sprint finalise :
- ✅ QA fonctionnelle (mobile, navigation)
- ✅ Accessibilité (WCAG 2.1 niveau A minimum)
- ✅ Performance (Lighthouse score >80)
- ✅ Tests E2E (Playwright smoke tests)
- ✅ Documentation utilisateur (landing, FAQ)
- ✅ Script de démo (5 min pour TVT)
- ✅ Plan de release (staging → prod)

---

## 1️⃣ QA Fonctionnelle

### 1.1 Checklist Mobile

#### Pages critiques à tester
- [ ] `/` (Landing)
- [ ] `/auth/sign-in`
- [ ] `/auth/register`
- [ ] `/dashboard`
- [ ] `/aube`
- [ ] `/aurora`
- [ ] `/letters`
- [ ] `/rise`
- [ ] `/cv-builder`

#### Tests par device
**Mobile (iPhone 12 / Pixel 5)** :
- [ ] Navigation burger menu fonctionne
- [ ] Cards responsive (pas de débordement)
- [ ] Inputs accessibles (pas trop petits)
- [ ] Boutons cliquables (min 44×44px)
- [ ] Pas de scroll horizontal

**Tablet (iPad)** :
- [ ] Layout adapté (ni mobile, ni desktop)
- [ ] Sidebar visible ou collapsible

**Desktop** :
- [ ] Largeur max respectable (pas de texte sur toute la largeur)
- [ ] Sidebar toujours visible

### 1.2 Checklist Navigation

#### Parcours utilisateur complet
1. **Inscription**
   - [ ] Formulaire valide
   - [ ] Erreurs affichées clairement
   - [ ] Redirection vers dashboard après signup

2. **Connexion**
   - [ ] Email/password valides
   - [ ] Message d'erreur si mauvais credentials
   - [ ] Remember me fonctionne

3. **Dashboard**
   - [ ] Toutes les cards chargent
   - [ ] Progress bar s'affiche
   - [ ] Energy wallet visible

4. **Aurora (nouveau)**
   - [ ] 3 chambres accessibles séquentiellement
   - [ ] IA répond (pas de timeout)
   - [ ] Bilan final s'affiche
   - [ ] +11 énergie créditée

5. **Aube**
   - [ ] Assessment rapide/complet
   - [ ] Matches générés
   - [ ] Reflection IA fonctionne

6. **CV Builder**
   - [ ] Génération CV
   - [ ] Partage public (/cv/share/<slug>)
   - [ ] Slug unique

7. **Letters**
   - [ ] Génération lettre
   - [ ] Publication galerie
   - [ ] Modération staff

8. **Rise**
   - [ ] Questions générées
   - [ ] Notes sauvegardées

### 1.3 Tests Cross-Browser

**Navigateurs à tester** :
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Vérifications** :
- [ ] Layout identique
- [ ] Animations fluides
- [ ] Fonts chargent correctement
- [ ] Pas de console errors

---

## 2️⃣ Accessibilité (A11y)

### 2.1 Tab Navigation

**Test manuel** :
1. Ouvre `/dashboard`
2. Appuie sur `Tab` répétitivement
3. Vérifie que :
   - [ ] Focus visible (outline ou ring)
   - [ ] Ordre logique (haut → bas, gauche → droite)
   - [ ] Tous les éléments interactifs accessibles
   - [ ] Skip links disponibles

### 2.2 ARIA Labels

**Checklist** :
- [ ] Boutons sans texte ont `aria-label`
- [ ] Icons décoratifs ont `aria-hidden="true"`
- [ ] Forms ont des labels associés
- [ ] Modals ont `role="dialog"` + `aria-labelledby`
- [ ] Loading states ont `aria-busy="true"`

### 2.3 Contraste Couleurs

**WCAG 2.1 niveau AA** :
- [ ] Texte normal : ratio ≥4.5:1
- [ ] Texte large : ratio ≥3:1
- [ ] UI components : ratio ≥3:1

**Outil** : [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### 2.4 Screen Reader

**Test avec VoiceOver (Mac)** :
```bash
# Active VoiceOver
Cmd + F5

# Navigate
Control + Option + Arrow keys
```

**Vérifications** :
- [ ] Headings annoncés correctement (h1, h2, h3)
- [ ] Links descriptifs (pas "cliquez ici")
- [ ] Forms fields labellisés
- [ ] Error messages lus à haute voix

---

## 3️⃣ Performance (Lighthouse)

### 3.1 Audit Lighthouse

```bash
# Option 1 : Chrome DevTools
# Ouvre DevTools → Lighthouse → Run audit

# Option 2 : CLI
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

### 3.2 Objectifs de Score

**Minimums acceptables** :
- Performance : ≥80
- Accessibility : ≥90
- Best Practices : ≥90
- SEO : ≥90

### 3.3 Optimisations Rapides

#### Images
- [ ] Format WebP/AVIF
- [ ] Lazy loading (`loading="lazy"`)
- [ ] Dimensions explicites (width, height)

#### Fonts
- [ ] `font-display: swap` ou `optional`
- [ ] Preload critical fonts

#### JavaScript
- [ ] Code splitting activé (Next.js le fait par défaut)
- [ ] Pas de bundles >500kb

#### CSS
- [ ] Tailwind purge activé (prod)
- [ ] Critical CSS inline

---

## 4️⃣ Tests E2E (Playwright)

### 4.1 Configuration Playwright

Fichier déjà présent : `playwright.config.ts`

### 4.2 Smoke Tests Critiques

Je vais créer les tests essentiels :

**Test 1 : Inscription & Dashboard**
```typescript
// tests/e2e/auth.spec.ts
test('user can sign up and access dashboard', async ({ page }) => {
  await page.goto('/auth/register');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

**Test 2 : Aurora Parcours**
```typescript
// tests/e2e/aurora.spec.ts
test('user can complete Aurora journey', async ({ page }) => {
  await page.goto('/aurora');
  // Chambre 1
  await page.fill('input[placeholder*="premier mot"]', 'curieux');
  await page.click('button:has-text("Envoyer")');
  // ... etc
  await expect(page.locator('text=Parcours terminé')).toBeVisible();
});
```

### 4.3 Lancer les Tests

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Run tests
npm run test:e2e

# Run with UI
npx playwright test --ui
```

---

## 5️⃣ Landing & FAQ

### 5.1 Landing Page Updates

**Page** : `/` (marketing)

**Sections à vérifier** :
- [ ] Hero clair (value proposition en <5s)
- [ ] CTA visible ("Commencer" ou "S'inscrire")
- [ ] Overview des 7 portails (Aube, Aurora, CV, Letters, Rise, Luna, Energy)
- [ ] Preuve sociale (si disponible)
- [ ] Footer avec liens légaux

### 5.2 FAQ Page

Créer `/faq` avec questions essentielles :

**Questions suggérées** :
1. Qu'est-ce que Phoenix ?
2. Comment fonctionne le système d'énergie ?
3. Aurora est-il gratuit ?
4. Mes données sont-elles sécurisées ?
5. Comment contacter le support ?
6. Puis-je supprimer mon compte ?

### 5.3 Support Page

Créer `/support` avec :
- Email contact
- Formulaire de feedback
- Lien vers FAQ
- Statut système (optionnel)

---

## 6️⃣ Script de Démo (5 min)

### 6.1 Scénario pour TVT Innovation (23/10)

**Durée** : 5 minutes chrono
**Objectif** : Montrer Aurora + écosystème Phoenix

#### **Minute 1 : Contexte** (30s)
> "Phoenix aide les professionnels en reconversion. Aujourd'hui je vais vous montrer **Aurora**, notre nouveau portail d'acculturation à l'IA, aligné avec le programme Région Sud - Terre d'IA."

#### **Minute 2 : Dashboard** (30s)
- Ouvre `/dashboard`
- Montre les 7 portails
- Focus sur Aurora (badge "Nouveau")
- Montre le wallet énergie

#### **Minute 3-4 : Aurora Demo** (2 min)
- Entre dans Aurora
- **Chambre 1 (Le Voile)** : Montre le dialogue empathique (30s)
- **Chambre 2 (L'Atelier)** : Explique vulgarisation IA (45s)
- **Chambre 3 (Le Dialogue)** : Montre exercice prompting (45s)

#### **Minute 5 : Bilan & Vision** (1 min)
- Affiche le bilan personnalisé
- Montre +11 énergie créditée
- **Pitch** :
  > "Aurora c'est TryHackMe pour le grand public. Gratuit, empathique, souverain (Mistral). Vision : déploiement médiathèques, lycées, tiers-lieux PACA. Roadmap B2B collectivités 2026."

### 6.2 Compte de Démo

**Créer un user de démo** :
```bash
npm run seed:admin demo@phoenix.app DemoPass123! DISCOVERY
```

**État du compte** :
- Aurora complété (bilan visible)
- Aube fait (3 matches)
- 1 CV généré
- 1 lettre brouillon
- Wallet : 50 points d'énergie

---

## 7️⃣ Plan de Release

### 7.1 Checklist Pre-Release

**Code** :
- [ ] Toutes les migrations appliquées
- [ ] Tests passent (unit + E2E)
- [ ] Pas de console.log en prod
- [ ] Variables d'env production configurées
- [ ] Build réussit sans warnings

**Data** :
- [ ] Backup DB avant déploiement
- [ ] Vues analytics créées
- [ ] Workers configurés (cron)

**Monitoring** :
- [ ] Logs accessibles (Railway/Vercel dashboard)
- [ ] Alertes configurées (erreurs critiques)
- [ ] Analytics Metabase connecté (optionnel)

### 7.2 Déploiement Staging → Prod

#### **Étape 1 : Staging**
```bash
# Deploy sur branche staging
git checkout staging
git merge main
git push origin staging

# Teste sur URL staging
# → https://phoenix-staging.railway.app (exemple)
```

**Tests staging** :
- [ ] Aurora fonctionne
- [ ] CV Share génère des slugs
- [ ] Parrainage crédite l'énergie
- [ ] Workers exécutés manuellement OK

#### **Étape 2 : Production**
```bash
# Tag la version
git tag -a v1.0.0-aurora -m "Sprint 7 + Aurora ready"
git push origin v1.0.0-aurora

# Deploy sur main
git checkout main
git merge staging
git push origin main
```

**Post-deploy checks** :
- [ ] URL prod accessible
- [ ] Pages chargent <3s
- [ ] Pas d'erreurs en logs
- [ ] Database connectée
- [ ] Analytics events loggés

### 7.3 Rollback Plan

**Si problème critique** :
```bash
# Option 1 : Revert commit
git revert HEAD
git push origin main

# Option 2 : Rollback Railway/Vercel
# → Via dashboard, redéployer version précédente

# Option 3 : Restore DB
# → psql $DATABASE_URL < backup-pre-aurora.sql
```

---

## 8️⃣ Checklist Go-Live (Jour J)

### Matin (avant 10h)
- [ ] Backup DB
- [ ] Deploy staging
- [ ] Tests staging OK
- [ ] Deploy prod
- [ ] Smoke tests prod

### Midi (12h-14h)
- [ ] Monitoring logs (pas d'erreurs)
- [ ] Tester inscription nouveau user
- [ ] Tester parcours Aurora complet
- [ ] Vérifier analytics loggés

### Après-midi (14h-18h)
- [ ] Préparer démo TVT (23/10)
- [ ] Tester script 5 min
- [ ] Vérifier compte démo prêt
- [ ] Screenshots pour pitch deck

---

## 9️⃣ Métriques Post-Launch (J+1 à J+7)

### Analytics à surveiller
- [ ] Nombre d'inscriptions
- [ ] Taux de complétion Aurora (≥60% attendu)
- [ ] Temps moyen parcours (≤25 min attendu)
- [ ] Errors rate (<1%)
- [ ] Bounce rate landing (<70%)

### Feedback utilisateurs
- [ ] NPS score (≥7/10 attendu)
- [ ] Verbatims positifs sur Aurora
- [ ] Bugs reportés (créer issues GitHub)

---

## 🎉 Critères de Succès Sprint 8

### Must-have (bloquants)
- ✅ Aurora fonctionne sur mobile
- ✅ Pas d'erreurs critiques en prod
- ✅ Tests E2E passent
- ✅ Démo 5 min prête

### Nice-to-have (non bloquants)
- ⭐ Lighthouse score >90
- ⭐ 100% accessibilité WCAG AA
- ⭐ FAQ complète
- ⭐ Support page

---

## 📞 Support & Escalation

**Problème bloquant (prod down)** :
1. Check Railway/Vercel logs
2. Rollback si nécessaire
3. Contact Claude (moi) pour debug

**Problème mineur (bug UX)** :
1. Créer issue GitHub
2. Prioriser pour patch post-launch

---

**Sprint 8 ready ! 🚀**

_Créé le 15 octobre 2025 par Claude_
