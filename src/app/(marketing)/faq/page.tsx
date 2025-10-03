const FAQ_ITEMS = [
  {
    question: 'Phoenix est-il gratuit ? Existe-t-il un essai ?',
    answer:
      'Oui, un plan Découverte est offert : 1 analyse Aube Express, un CV d’essai et 3 échanges avec Luna. Vous pouvez ensuite passer à Essentiel ou Pro à tout moment pour profiter des parcours complets.',
  },
  {
    question: 'Comment fonctionne Aube ?',
    answer:
      'Aube croise vos traits de personnalité (Big Five), vos intérêts RIASEC et vos préférences de travail. Un moteur IA contextualisé marché français vous propose ensuite des trajectoires, écarts de compétences et actions rapides.',
  },
  {
    question: 'Puis-je exporter mes contenus ?',
    answer:
      'Oui : l’abonnement Essentiel inclut les exports Markdown/Docx. Le plan Pro ajoute des exports PDF, Notion et ATS optimisés. Les améliorations PDF sont en cours durant la bêta.',
  },
  {
    question: 'Quelles sont les limites d’utilisation par plan ?',
    answer:
      'Essentiel : analyses Aube Quick illimitées, 10 sessions Rise/Luna par mois, CV et lettres en illimité. Pro : Aube Complete illimité, Rise/Luna illimités, support prioritaire.',
  },
  {
    question: 'Comment résilier mon abonnement ?',
    answer:
      'Rendez-vous dans “Mon abonnement” depuis votre tableau de bord. Vous accéderez au portail Stripe sécurisé pour résilier en 1 clic. L’accès reste actif jusqu’à la fin de la période en cours.',
  },
  {
    question: "Que deviennent mes données si je quitte Phoenix ?",
    answer:
      'Vous pouvez demander leur suppression intégrale via support@phoenix-career.fr. Les contenus générés resteront disponibles au téléchargement pendant 30 jours après résiliation avant suppression.',
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-12 text-white">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          Questions fréquentes
        </span>
        <h1 className="text-3xl font-semibold">FAQ Phoenix</h1>
        <p className="text-sm text-white/60">
          Retrouvez les réponses aux interrogations récurrentes sur l’abonnement, les fonctionnalités et la protection de vos données.
        </p>
      </header>

      <section className="space-y-4 text-sm text-white/70">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-base font-semibold text-white">{item.question}</h2>
            <p className="mt-2 leading-relaxed">{item.answer}</p>
          </article>
        ))}
      </section>

      <footer className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-xs text-white/50">
        Une autre question ? Écrivez-nous à
        <a className="ml-1 text-emerald-200 hover:text-emerald-100" href="mailto:support@phoenix-career.fr">
          support@phoenix-career.fr
        </a>
        . Nous répondons sous 24h ouvrées.
      </footer>
    </div>
  );
}
