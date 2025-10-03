import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CompatibilityBadge } from '@/components/ui/badge';
import { Recommendation } from '@/components/assessment/assessment-form';

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitSummary(summary?: string | null) {
  if (!summary) return [];
  return summary
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

type AssessmentCompleteReportProps = {
  summary: string | null;
  recommendations: Recommendation[];
};

export function AssessmentCompleteReport({ summary, recommendations }: AssessmentCompleteReportProps) {
  const summaryParagraphs = splitSummary(summary);
  const allSkills = uniqueValues(recommendations.flatMap((rec) => rec.requiredSkills ?? []));
  const allFocus = uniqueValues(recommendations.flatMap((rec) => rec.developmentFocus ?? []));

  const quickActions = [
    {
      title: 'Transformer en CV ciblé',
      description: 'Importez la trajectoire sélectionnée dans le Créateur de CV pour générer un brouillon personnalisé.',
      href: '/cv-builder',
    },
    {
      title: 'Préparer un atelier Rise',
      description: 'Générez un plan d’entretien adapté au métier choisi avec coaching Luna intégré.',
      href: '/rise',
    },
    {
      title: 'Débriefer avec Luna',
      description: 'Partagez vos résultats Aube à Luna pour prioriser vos prochains leviers de progression.',
      href: '/luna',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Lecture synthétique</CardTitle>
          <CardDescription>Ce que révèle votre profil et les dynamiques à activer en priorité.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/70">
          {summaryParagraphs.length > 0 ? (
            summaryParagraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="leading-relaxed text-white/50">
              La synthèse détaillée sera disponible après la prochaine analyse complète.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Trajectoires Aube</CardTitle>
          <CardDescription>Trois pistes d’évolution avec vos leviers de succès et actions d’upskilling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {recommendations.map((item) => (
            <article key={item.careerTitle} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{item.careerTitle}</h3>
                  {item.sector && <p className="text-sm text-white/60">Secteur&nbsp;: {item.sector}</p>}
                </div>
                <CompatibilityBadge value={Math.round(item.compatibilityScore)} />
              </div>
              {item.description && <p className="mt-3 text-sm text-white/70">{item.description}</p>}
              {item.requiredSkills?.length ? (
                <div className="mt-4 text-xs text-white/60">
                  <span className="uppercase tracking-wide text-white/60">Compétences clés</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.requiredSkills.map((skill) => (
                      <span key={skill} className="rounded-full bg-white/10 px-3 py-1">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.developmentFocus?.length ? (
                <div className="mt-4 text-xs text-white/60">
                  <span className="uppercase tracking-wide text-white/60">Chantiers de progression</span>
                  <ul className="mt-2 space-y-1">
                    {item.developmentFocus.map((focus) => (
                      <li key={focus}>• {focus}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {item.salaryRange && (
                <div className="mt-4 text-sm text-white/70">Rémunération indicative&nbsp;: {item.salaryRange}</div>
              )}
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Forces consolidées</CardTitle>
          <CardDescription>Utilisez ces éléments différenciants dans vos CV, lettres et entretiens.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <h4 className="text-sm font-semibold text-white">Compétences récurrentes</h4>
            {allSkills.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {allSkills.map((skill) => (
                  <li key={skill}>• {skill}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/50">Complétez Aube ou votre CV pour enrichir cette liste.</p>
            )}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <h4 className="text-sm font-semibold text-white">Axes de progression</h4>
            {allFocus.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {allFocus.map((focus) => (
                  <li key={focus}>• {focus}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/50">Renseignez vos axes de progression pour générer un plan d’action personnalisé.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Passer à l’action</CardTitle>
          <CardDescription>Activez les modules Phoenix complémentaires pour capitaliser sur ces résultats.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/60 hover:bg-white/10"
            >
              <div>
                <h3 className="text-sm font-semibold text-white">{action.title}</h3>
                <p className="mt-2 text-xs text-white/60">{action.description}</p>
              </div>
              <span className="mt-4 text-xs font-semibold text-emerald-200">Ouvrir</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
