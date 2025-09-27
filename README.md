# Phoenix — Career Development Platform

Phoenix is a production-ready web application that helps professionals map, build, and activate their next career move. The platform blends psychometric assessments, AI-generated content, coaching workflows, and subscription-based access to orchestrate personalised guidance across the user journey.

## ✨ Core Modules

- **Homepage** — Marketing landing page with hero, module overview, and conversions to registration.
- **Aube (Career Discovery)** — Multi-step Big Five + RIASEC assessment with AI career matching, compatibility scores, and actionable summaries.
- **CV Builder** — Role-targeted resume generator with template selection, experience structuring, and ATS-friendly output.
- **Letters** — Cover letter studio with tone control, highlights, and instant content generation.
- **Rise (Interview Studio)** — Interview preparation workshop with curated question sets and Luna coaching prompts.
- **Dashboard** — Mission control showing subscription status, recent activity, top career matches, and quick links.
- **Luna Assistant** — Persistent chat/sidebar delivering contextual coaching with plan-based access control.

## 🧱 Architecture Overview

| Layer | Stack & Notes |
| --- | --- |
| Front-end | Next.js App Router, React 19, TypeScript, Tailwind v4 styles, Lucide icons |
| State & Data | React Query for client data fetching, React Hook Form + Zod for form orchestration |
| Authentication | NextAuth credentials provider, Prisma adapter, secure middleware guard for app routes |
| Database | PostgreSQL schema managed with Prisma ORM (`src/generated/prisma`) |
| AI Integrations | OpenAI / Google Gemini abstraction with caching & fallback logic (`src/lib/ai.ts`) |
| Payments | Stripe subscriptions (Checkout + Webhooks) for plan management |
| Email | Nodemailer SMTP integration for assessment completion notifications |
| Analytics | Custom module for usage logging, caching, and analytics events |

## 📦 Getting Started

```bash
npm install
npm run prisma:generate
# optionally push schema to your database
# npm run prisma:push
npm run dev
```

The app runs on `http://localhost:3000`.

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth configuration
- `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_API_KEY` — AI providers (at least one required)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ESSENTIAL`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET` — Stripe subscriptions
- `DEFAULT_SUBSCRIPTION_PLAN` — Plan assigned on sign-up
- `EMAIL_*` — SMTP credentials for notifications
- `APP_BASE_URL` — Public URL of the app

### Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Production build |
| `npm run start` | Run the built application |
| `npm run lint` | Lint source files |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Run migrations locally |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed:admin` | Create/update a local admin user (email/password optional) |

## 🧪 Feature Highlights & Workflows

- **Assessments** — `Assessment` entities store responses and AI results; `CareerMatch` records hold structured recommendations. Assessment completion triggers analytics logging and an email notification.
- **AI Layer** — `src/lib/ai.ts` centralises prompts, provider fallback, and response caching (`AiCache` table). Career matching, CVs, cover letters, interview sets, and Luna messages all run through this gateway.
- **Stripe Subscriptions** — `/api/stripe/checkout` crée des sessions d’abonnement, `/api/stripe/webhook` synchronise les statuts utilisateurs.
- **Luna Assistant** — `/api/luna` s’appuie sur le statut d’abonnement, stocke l’historique et alimente le contexte IA.
- **Analytics** — `AnalyticsEvent` records log engagement signals (assessment runs, plan upgrades, module views, chat usage).

## 🗂️ Project Structure (partial)

```
src/
  app/
    (marketing)/        # Public landing layout and homepage
    (dashboard)/        # Authenticated layout + dashboard, modules
    auth/               # Sign-in, register, error flows
    api/                # REST endpoints (auth, assessments, cv, letters, stripe, luna, etc.)
  components/
    assessment/         # Aube multi-step form
    cv/                 # CV builder experience
    letters/            # Cover letter generator
    luna/               # Sidebar assistant
    rise/               # Interview practice
    ui/                 # Tailwind-based UI primitives
    pricing/            # Subscription CTA components
  lib/
    ai.ts               # AI integration + caching
    analytics.ts        # Usage logging helpers
    auth.ts             # NextAuth options & session helpers
    subscription.ts     # Subscription helpers (features & entitlements)
    mailer.ts           # Email notifications
    prisma.ts           # Prisma client singleton
    stripe.ts           # Stripe helpers
```

## ✅ Production Hardening Notes

- All sensitive operations are guarded by NextAuth middleware.
- Prisma schema enforces relational integrity with cascades and unique constraints.
- AI operations implement provider fallback + cached responses to cap quota usage.
- Stripe webhook expects the raw body and validates signatures before credit fulfilment.
- Frontend forms use strict Zod schemas with conditional validation per assessment mode.
- ESLint ignores generated clients but enforces strict standards on application code.

## 🚀 Deployment Checklist

1. Provision PostgreSQL and update `DATABASE_URL`.
2. Run `npm run prisma:migrate` to create the schema.
3. Configure production environment variables (Auth, AI, Stripe, Email).
4. Set up the Stripe webhook endpoint pointing to `/api/stripe/webhook`.
5. Seed your admin account (`npm run seed:admin admin@votre-domaine.com MonMotDePasse Pro`).
6. Deploy to votre plateforme (Vercel/Render/Fly) et promote the build with `npm run build`.
7. Monitor analytics tables for adoption insights.

---
Phoenix is ready to help talents rise — configure your providers, seed your first users, and take off.
