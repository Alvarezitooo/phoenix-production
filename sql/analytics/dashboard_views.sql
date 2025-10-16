-- Analytics dashboard helper views
-- Execute on the operational database before connecting Metabase/Looker.

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE OR REPLACE VIEW analytics.vw_daily_energy_ledger AS
SELECT
  DATE_TRUNC('day', "createdAt")::date AS event_date,
  "type" AS transaction_type,
  COALESCE("metadata" ->> 'action', "reference", 'unknown') AS action,
  SUM("amount") AS net_amount,
  SUM(CASE WHEN "amount" > 0 THEN "amount" ELSE 0 END) AS total_credits,
  SUM(CASE WHEN "amount" < 0 THEN ABS("amount") ELSE 0 END) AS total_spent,
  COUNT(*) AS transaction_count
FROM "EnergyTransaction"
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW analytics.vw_energy_spend_events AS
SELECT
  DATE_TRUNC('day', ae."createdAt")::date AS event_date,
  ae."userId",
  ae."metadata" ->> 'action' AS action,
  (ae."metadata" ->> 'cost')::int AS cost,
  (ae."metadata" ->> 'balanceAfter')::int AS balance_after,
  (ae."metadata" ->> 'streakDays')::int AS streak_days,
  (ae."metadata" ->> 'bonusAwarded')::int AS bonus_awarded
FROM "AnalyticsEvent" ae
WHERE ae."type" = 'ENERGY_SPENT';

CREATE OR REPLACE VIEW analytics.vw_portal_aube AS
WITH viewed AS (
  SELECT "userId", "createdAt" AS viewed_at
  FROM "AnalyticsEvent"
  WHERE "type" = 'AUBE_PORTAL_VIEWED'
),
completed AS (
  SELECT "userId", "createdAt" AS completed_at, "metadata" ->> 'element' AS element
  FROM "AnalyticsEvent"
  WHERE "type" = 'AUBE_PORTAL_COMPLETED'
)
SELECT
  v."userId",
  v.viewed_at,
  c.completed_at,
  c.element,
  CASE WHEN c.completed_at IS NOT NULL THEN TRUE ELSE FALSE END AS completed,
  EXTRACT(EPOCH FROM (c.completed_at - v.viewed_at)) / 60.0 AS minutes_to_completion
FROM viewed v
LEFT JOIN LATERAL (
  SELECT c.completed_at, c.element
  FROM completed c
  WHERE c."userId" = v."userId"
    AND c.completed_at >= v.viewed_at
  ORDER BY c.completed_at ASC
  LIMIT 1
) c ON TRUE;

CREATE OR REPLACE VIEW analytics.vw_rituals_daily AS
SELECT
  DATE_TRUNC('day', ae."createdAt")::date AS ritual_date,
  ae."metadata" ->> 'ritualId' AS ritual_id,
  COUNT(*) AS completions,
  SUM((ae."metadata" ->> 'reward')::int) AS energy_rewarded,
  COUNT(DISTINCT ae."userId") AS distinct_users
FROM "AnalyticsEvent" ae
WHERE ae."type" = 'RITUAL_COMPLETED'
GROUP BY 1, 2;

CREATE OR REPLACE VIEW analytics.vw_pack_funnel AS
WITH events AS (
  SELECT
    COALESCE(ae."metadata" ->> 'packId', 'unknown') AS pack_id,
    ae."type" AS event_type
  FROM "AnalyticsEvent" ae
  WHERE ae."type" IN ('ENERGY_PACK_VIEW', 'ENERGY_PACK_CLICK', 'PACK_PURCHASED')
),
purchases AS (
  SELECT
    pack_id,
    SUM("amountInCents") AS revenue_cents
  FROM (
    SELECT
      COALESCE(ae."metadata" ->> 'packId', ep."packId", 'unknown') AS pack_id,
      ep."amountInCents"
    FROM "AnalyticsEvent" ae
    LEFT JOIN "EnergyPackPurchase" ep ON ep."stripeCheckoutSessionId" = ae."metadata" ->> 'stripeSessionId'
    WHERE ae."type" = 'PACK_PURCHASED'
  ) p
  GROUP BY pack_id
)
SELECT
  e.pack_id,
  SUM(CASE WHEN e.event_type = 'ENERGY_PACK_VIEW' THEN 1 ELSE 0 END) AS views,
  SUM(CASE WHEN e.event_type = 'ENERGY_PACK_CLICK' THEN 1 ELSE 0 END) AS clicks,
  SUM(CASE WHEN e.event_type = 'PACK_PURCHASED' THEN 1 ELSE 0 END) AS purchases,
  COALESCE(p.revenue_cents, 0) AS revenue_cents
FROM events e
LEFT JOIN purchases p ON p.pack_id = e.pack_id
GROUP BY e.pack_id, p.revenue_cents;

CREATE OR REPLACE VIEW analytics.vw_user_energy_health AS
WITH latest_event AS (
  SELECT
    ae."userId",
    MAX(ae."createdAt") AS last_event_at
  FROM "AnalyticsEvent" ae
  GROUP BY ae."userId"
),
latest_transaction AS (
  SELECT
    et."userId",
    MAX(et."createdAt") AS last_transaction_at
  FROM "EnergyTransaction" et
  GROUP BY et."userId"
)
SELECT
  ew."userId",
  ew."balance",
  ew."currentStreakDays" AS streak_days,
  ew."lastEnergyActionAt" AS last_energy_action_at,
  ew."lastBonusAwardedAt" AS last_bonus_awarded_at,
  le.last_event_at,
  lt.last_transaction_at
FROM "EnergyWallet" ew
LEFT JOIN latest_event le ON le."userId" = ew."userId"
LEFT JOIN latest_transaction lt ON lt."userId" = ew."userId";
