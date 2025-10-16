# Phoenix · Tableau de bord Metabase/Looker

Ce document détaille le pipeline à mettre en place pour exploiter les données énergie & portails dans Metabase/Looker.

## 1. Connexion base & sécurité
- Créer un rôle Postgres en lecture seule (`phoenix_analytics_ro`).
- Accorder les droits sur `public."AnalyticsEvent"`, `public."EnergyWallet"`, `public."EnergyTransaction"`, ainsi que le schéma `analytics` (vues).
- Utiliser ce rôle pour la connexion Metabase/Looker (pas de privilèges d’écriture).

## 2. Instrumentation disponible
- `AnalyticsEvent` enregistre : vues/completions Aube, réflexions, rituels, chat, energy pack view/click, bonus streak, assessments.
- `AnalyticsEvent` enregistre : vues/completions Aube, réflexions, rituels, chat, energy pack view/click, bonus streak, assessments, CV générés (`CV_GENERATED`).
- `EnergyTransaction` trace les crédits/dépenses, avec `metadata` enrichi (`action`, `source`).
- `EnergyWallet` contient le solde courant + streak.
- Nouveau type `ENERGY_SPENT` (loggé dans `spendEnergy`) fournit coût, solde post-action, streak.
- Type `PACK_PURCHASED` réservé aux intégrations checkout (à déclencher lors du succès par webhook Stripe/Resend/Supabase).

## 3. Vues SQL recommandées
Exécuter `sql/analytics/dashboard_views.sql` :
- `analytics.vw_daily_energy_ledger` : ledger journalier des transactions énergie (crédits/dépenses par action).
- `analytics.vw_energy_spend_events` : granularité par événement `ENERGY_SPENT` (coût, streak, balance restante).
- `analytics.vw_portal_aube` : conversion et temps de complétion du portail Aube par user.
- `analytics.vw_rituals_daily` : complétions de rituels + énergie distribué.
- `analytics.vw_pack_funnel` : entonnoir pack (view → click → purchase) + revenu associé.
- `analytics.vw_user_energy_health` : snapshot solde & dernière activité.

## 4. Modèles Looker/Metabase
- Déclarer chaque vue comme table source.
- Dimensions principales : `event_date`, `transaction_type`, `action`, `pack_id`, `element`, `ritual_id`.
- Mesures clefs : `net_amount`, `total_spent`, `total_credits`, `completions`, `views`, `clicks`, `purchases`, `minutes_to_completion` (moyenne, médiane).
- Créer des segments (Looker) / colonnes calculées (Metabase) pour : cohorte d’inscription, type de module (`action` prefix), seuils de streak (`streak_days >= 3`).

## 5. Dashboards conseillés
1. **Énergie & Monétisation** :
   - Solde total vs consommé (rolling 30j).
   - Dépenses par module (`action`).
   - Entonnoir pack (view→click→purchase) + taux conversion.
   - Utilisation bonus streak (nombre d’events `ENERGY_BONUS_STREAK`).
2. **Portail Aube & Rituels** :
   - Vues/completions Aube, time-to-complete médian.
   - Réflexions IA par jour.
   - Rituels complétés vs utilisateurs actifs.
3. **Activation produit** :
   - Distribution dépenses par cohortes d’inscription.
   - Utilisateurs à solde faible (<10 pts) & dernière action (>7 jours).
4. **Constellations & Ops** :
   - Derniers événements (Aube complété, badge Rise, pack achats, parrainage).
   - Suivi workers (rappels lettres, rituels, streak) via `WorkerRun`.

## 6. Backlog instrumentation
- [ ] Brancher webhook d’achat pack pour émettre `PACK_PURCHASED` (`metadata`: `packId`, `amount`, `paymentIntentId`).
- [ ] Harmoniser `metadata.source` sur tous les `spendEnergy` (ex : `letters`, `cv-builder`).
- [ ] Ajouter guide QA (dbt tests ou Metabase Alerts) : valeurs `cost` positives, bonus cohérents, users sans wallet.
- [ ] Planifier rétention AnalyticsEvent (purge au-delà de 12 mois si besoin).

## 7. Validation
- Tester les vues avec `SELECT * FROM analytics.vw_daily_energy_ledger LIMIT 20;`.
- Vérifier qu’`ENERGY_SPENT` se remplit en lançant manuellement une action (profil local).
- S’assurer que Metabase/Looker voit bien le schéma `analytics` (actualisation metadata).

## 8. Prochaines étapes
- Déployer les vues sur l’environnement de staging.
- Configurer dashboard “Phoenix – Energie Live” dans Metabase et le partager à l’équipe produit.
- Intégrer alertes mail (Metabase Pulses) sur forte baisse du taux de complétion Aube ou explosion du nombre d’utilisateurs à 0 énergie.
