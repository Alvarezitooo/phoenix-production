import dayjs from 'dayjs';
import 'dayjs/locale/fr';

const LEGAL_ENTITIES = [
  {
    title: 'Éditeur du site',
    content: [
      'Phoenix (projet en bêta) — responsable de la publication.',
      'Email : support@phoenix-career.fr',
      'Adresse : 10 rue de la Startup, 75000 Paris, France',
      'Directeur de la publication : Matt Vaness',
    ],
  },
  {
    title: 'Hébergement',
    content: [
      'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
      'Support : support@vercel.com',
    ],
  },
  {
    title: 'Propriété intellectuelle',
    content: [
      'L’ensemble des éléments graphiques, textes et contenus générés dans Phoenix restent la propriété de leurs auteurs ou des utilisateurs qui les produisent.',
      'Toute reproduction ou diffusion sans autorisation écrite préalable est interdite.',
    ],
  },
  {
    title: 'Responsabilité',
    content: [
      'Les informations fournies via Phoenix ont vocation à accompagner la réflexion professionnelle. Elles ne constituent pas un conseil juridique ou financier.',
      'Le service est proposé en bêta : des interruptions ou erreurs peuvent survenir. Merci de nous signaler tout dysfonctionnement.',
    ],
  },
];

const lastUpdate = dayjs().locale('fr').format('D MMMM YYYY');

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 py-12 text-white">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          Confiance & transparence
        </span>
        <h1 className="text-3xl font-semibold">Mentions légales</h1>
        <p className="text-sm text-white/60">
          Ces informations permettent d’identifier l’éditeur du site Phoenix et les conditions de responsabilité associées à son utilisation.
        </p>
        <p className="text-xs text-white/60">Dernière mise à jour : {lastUpdate}</p>
      </header>

      <section className="space-y-8 text-sm text-white/70">
        {LEGAL_ENTITIES.map((section) => (
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
        Phoenix s’engage à mettre à jour ces informations à chaque évolution juridique ou éditoriale du projet. Pour toute question, écrivez-nous à
        <a className="ml-1 text-emerald-200 hover:text-emerald-100" href="mailto:support@phoenix-career.fr">
          support@phoenix-career.fr
        </a>
        .
      </footer>
    </div>
  );
}
