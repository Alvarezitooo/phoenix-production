const SECTIONS = [
  {
    title: 'Collecte des données',
    content: [
      'Création de compte : nom, prénom, adresse email et mot de passe hashé.',
      'Utilisation des modules : réponses aux questionnaires, contenus générés (CV, lettres, notes Rise).',
      'Données techniques : journaux applicatifs anonymisés pour la maintenance du service.',
    ],
  },
  {
    title: 'Finalités',
    content: [
      'Fournir les fonctionnalités de Phoenix (diagnostic Aube, CV, lettres, coaching Luna).',
      'Améliorer la qualité du service grâce à l’analyse d’usage agrégée.',
      'Respecter les obligations légales et lutter contre la fraude.',
    ],
  },
  {
    title: 'Conservation',
    content: [
      'Les données de compte sont conservées tant que l’utilisateur maintient son abonnement ou son accès.',
      'Les contenus générés peuvent être supprimés à tout moment depuis le tableau de bord (fonctionnalité en cours d’implémentation durant la bêta).',
      'Les logs techniques sont conservés 12 mois maximum.',
    ],
  },
  {
    title: 'Partage avec des tiers',
    content: [
      'Fournisseurs cloud (hébergement, emailing, monitoring) opérant dans l’Union européenne ou soumis au Privacy Shield.',
      'Prestataires IA (OpenAI, Google) pour la génération de contenus. Les prompts sont minimisés et aucune donnée sensible n’est partagée intentionnellement.',
      'Aucun transfert de données à des fins commerciales sans consentement explicite.',
    ],
  },
  {
    title: 'Vos droits',
    content: [
      'Accès, rectification et suppression de vos données : écrivez à support@phoenix-career.fr.',
      'Portabilité et limitation : nous pouvons fournir un export JSON/CSV de vos données sur demande.',
      'Droit d’introduire une réclamation auprès de la CNIL.',
    ],
  },
  {
    title: 'Sécurité',
    content: [
      'Chiffrement TLS en transit, mots de passe hashés (bcrypt).',
      'Accès restreint à l’équipe projet, authentification renforcée sur les consoles d’administration.',
      'Audit sécurité prévu avant la sortie hors bêta.',
    ],
  },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-12 text-white">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          Protection des données
        </span>
        <h1 className="text-3xl font-semibold">Politique de confidentialité</h1>
        <p className="text-sm text-white/60">
          Nous décrivons ici la manière dont Phoenix collecte, utilise et protège les données nécessaires à l’accompagnement de votre trajectoire professionnelle.
        </p>
      </header>

      <section className="space-y-8 text-sm text-white/70">
        {SECTIONS.map((section) => (
          <article key={section.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <ul className="mt-3 space-y-2">
              {section.content.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <footer className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-xs text-white/50">
        Pour toute question relative à la protection de vos données ou pour exercer vos droits, contactez notre DPO à
        <a className="ml-1 text-emerald-200 hover:text-emerald-100" href="mailto:support@phoenix-career.fr">
          support@phoenix-career.fr
        </a>
        .
      </footer>
    </div>
  );
}
