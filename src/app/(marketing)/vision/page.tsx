import { Metadata } from 'next';
import { Sparkles, Shield, Code, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Notre Vision | Phoenix-Luna',
  description: 'Rendre l\'IA accessible, souveraine et humaine. Découvrez nos engagements et notre roadmap.',
};

export default function VisionPage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
            <span className="text-base">🇫🇷</span>
            Notre engagement
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Rendre l'IA accessible, souveraine et humaine
          </h1>
          <p className="max-w-3xl text-lg text-white/70">
            Phoenix-Luna est né d'un constat simple : les outils d'accompagnement carrière sont soit trop génériques (ChatGPT),
            soit trop chers (LinkedIn Premium à 30€/mois), soit dépendants des géants américains.
          </p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Intelligence Artificielle Française</h2>
          <p className="mt-4 text-sm text-white/70">
            Nous utilisons <strong className="text-white">Mistral AI</strong>, leader français de l'IA générative.
            Ce choix technique n'est pas anodin : c'est un engagement pour la souveraineté numérique européenne.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Pas de dépendance aux géants américains. Pas de transfert de données hors Europe. Pas de compromis.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Données Protégées</h2>
          <p className="mt-4 text-sm text-white/70">
            Vos informations personnelles sont hébergées en <strong className="text-white">Union Européenne</strong> (Amsterdam, Pays-Bas).
            Conformité RGPD garantie. Pas de revente de données. Jamais.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Votre vie privée n'est pas à vendre. Votre parcours professionnel vous appartient.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Modèle Économique Éthique</h2>
          <p className="mt-4 text-sm text-white/70">
            Pas d'abonnement piège. Vous payez ce que vous consommez, quand vous en avez besoin.
            Le portail <strong className="text-white">Aurora</strong> (acculturation IA) reste gratuit pour tous.
          </p>
          <p className="mt-3 text-sm text-white/70">
            2,99€ pour 13 CV vs 19€/mois chez Kickresume. On ne vous prend pas pour une vache à lait.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500">
            <Code className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Développé dans le Var</h2>
          <p className="mt-4 text-sm text-white/70">
            Phoenix-Luna est développé dans le Var (83), au cœur de la French Tech Toulon.
            Nous sommes candidats pour rejoindre l'écosystème <strong className="text-white">TVT Innovation</strong>.
          </p>
          <p className="mt-3 text-sm text-white/70">
            Un projet local avec une ambition nationale. Made in Var, pensé pour la France.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-8">
        <h2 className="text-2xl font-semibold text-white">Roadmap Souveraineté</h2>
        <p className="mt-2 text-sm text-white/60">
          Notre feuille de route pour renforcer l'indépendance technologique
        </p>
        <div className="mt-8 space-y-6">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-white">Migration vers Mistral AI</h3>
              <p className="mt-1 text-sm text-white/70">
                <strong className="text-emerald-300">Q4 2025 · Terminé</strong> — Tous les modules (Aube, CV, Lettres, Rise, Luna) utilisent Mistral AI
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/20 text-sm font-semibold text-white/60">
              ○
            </div>
            <div>
              <h3 className="font-semibold text-white">Modèles Mistral en local</h3>
              <p className="mt-1 text-sm text-white/70">
                <strong className="text-white/50">2026 · Exploration</strong> — Tester Ollama et edge computing pour exécuter Mistral localement
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/20 text-sm font-semibold text-white/60">
              ○
            </div>
            <div>
              <h3 className="font-semibold text-white">Hébergement 100% français</h3>
              <p className="mt-1 text-sm text-white/70">
                <strong className="text-white/50">2026 · Évaluation</strong> — Migration vers OVH (Roubaix/Strasbourg) pour un hébergement entièrement français
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/20 text-sm font-semibold text-white/60">
              ○
            </div>
            <div>
              <h3 className="font-semibold text-white">Open-source partiel</h3>
              <p className="mt-1 text-sm text-white/70">
                <strong className="text-white/50">2026 · Réflexion</strong> — Ouverture du code d'Aurora (acculturation IA) à la communauté
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <h2 className="text-2xl font-semibold text-white">Rejoignez l'aventure</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60">
          Phoenix-Luna est en version bêta. Vos retours façonnent le futur de l'accompagnement carrière par l'IA.
          Inscrivez-vous gratuitement et participez à la construction d'une alternative souveraine et éthique.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
          >
            Commencer gratuitement
          </a>
          <a
            href="mailto:contact@phoenix-career.fr"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Nous contacter
          </a>
        </div>
        <p className="mt-6 text-xs text-white/40">
          <strong>Matthieu Rubia</strong> · Fondateur · Auto-entrepreneur · Var (83)
        </p>
      </section>
    </div>
  );
}
