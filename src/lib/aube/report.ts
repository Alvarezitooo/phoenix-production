import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import type { Recommendation } from '@/components/assessment/assessment-form';

type AssessmentReportContext = {
  summary: string | null;
  recommendations: Recommendation[];
  responses?: Record<string, unknown> | null;
  completedAt?: Date | null;
};

function formatDate(date: Date | null | undefined) {
  if (!date) return dayjs().locale('fr').format('D MMMM YYYY');
  return dayjs(date).locale('fr').format('D MMMM YYYY');
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildAssessmentReportMarkdown({ summary, recommendations, responses, completedAt }: AssessmentReportContext) {
  const lines: string[] = [];
  lines.push(`# Rapport Aube — ${formatDate(completedAt ?? new Date())}`);
  lines.push('');

  lines.push('## Synthèse');
  if (summary) {
    summary
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph) => {
        lines.push(paragraph);
        lines.push('');
      });
  } else {
    lines.push('La synthèse détaillée sera disponible après la prochaine analyse complète.');
    lines.push('');
  }

  if (responses && typeof responses === 'object') {
    const workPreferences = Array.isArray((responses as Record<string, unknown>).workPreferences)
      ? ((responses as Record<string, unknown>).workPreferences as string[])
      : [];
    const strengths = Array.isArray((responses as Record<string, unknown>).strengths)
      ? ((responses as Record<string, unknown>).strengths as string[])
      : [];
    const growthAreas = Array.isArray((responses as Record<string, unknown>).growthAreas)
      ? ((responses as Record<string, unknown>).growthAreas as string[])
      : [];
    const interests = Array.isArray((responses as Record<string, unknown>).interests)
      ? ((responses as Record<string, unknown>).interests as string[])
      : [];
    const narrative = typeof (responses as Record<string, unknown>).narrative === 'string'
      ? ((responses as Record<string, unknown>).narrative as string)
      : null;

    if (workPreferences.length || strengths.length || growthAreas.length || interests.length || narrative) {
      lines.push('## Votre profil en un coup d’œil');
      if (workPreferences.length) {
        lines.push('**Préférences clés**');
        workPreferences.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
      if (strengths.length) {
        lines.push('**Forces actuelles**');
        strengths.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
      if (growthAreas.length) {
        lines.push('**Axes de progression identifiés**');
        growthAreas.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
      if (interests.length) {
        lines.push('**Centres d’intérêt professionnels**');
        interests.forEach((item) => lines.push(`- ${item}`));
        lines.push('');
      }
      if (narrative) {
        lines.push('**Ambition formulée**');
        lines.push(narrative.trim());
        lines.push('');
      }
    }
  }

  lines.push('## Trajectoires recommandées');
  if (recommendations.length === 0) {
    lines.push('Relancez une analyse complète pour obtenir vos recommandations personnalisées.');
    lines.push('');
  }

  recommendations.forEach((item, index) => {
    const header = `### ${index + 1}. ${item.careerTitle}${item.sector ? ` — ${item.sector}` : ''}`;
    lines.push(header);
    lines.push(`- Compatibilité estimée : ${Math.round(item.compatibilityScore)}%`);
    if (item.salaryRange) {
      lines.push(`- Rémunération indicative : ${item.salaryRange}`);
    }
    if (item.description) {
      lines.push('');
      lines.push(item.description.trim());
    }
    if (item.requiredSkills?.length) {
      lines.push('');
      lines.push('**Compétences clés :**');
      item.requiredSkills.forEach((skill) => lines.push(`- ${skill}`));
    }
    if (item.developmentFocus?.length) {
      lines.push('');
      lines.push('**Chantiers de progression :**');
      item.developmentFocus.forEach((focus) => lines.push(`- ${focus}`));
    }
    if (item.quickWins?.length) {
      lines.push('');
      lines.push('**Actions rapides :**');
      item.quickWins.forEach((action) => lines.push(`- ${action}`));
    }
    lines.push('');
  });

  const aggregatedSkills = uniqueValues(recommendations.flatMap((rec) => rec.requiredSkills ?? []));
  const aggregatedFocus = uniqueValues(recommendations.flatMap((rec) => rec.developmentFocus ?? []));

  lines.push('## Forces consolidées');
  if (aggregatedSkills.length) {
    lines.push('**Compétences récurrentes**');
    aggregatedSkills.forEach((skill) => lines.push(`- ${skill}`));
    lines.push('');
  } else {
    lines.push('Complétez vos parcours Aube ou CV pour enrichir cette section.');
    lines.push('');
  }

  lines.push('## Axes de progression');
  if (aggregatedFocus.length) {
    aggregatedFocus.forEach((focus) => lines.push(`- ${focus}`));
  } else {
    lines.push('Renseignez vos axes de progression pour générer un plan d’action détaillé.');
  }
  lines.push('');

  lines.push('## Activer les prochaines étapes');
  lines.push('- Générer un CV ciblé depuis le Créateur de CV Phoenix.');
  lines.push('- Préparer un atelier Rise pour transformer ces recommandations en réponses d’entretien.');
  lines.push('- Débriefer avec Luna pour prioriser vos leviers de progression.');
  lines.push('');

  lines.push('---');
  lines.push('Rapport généré via Phoenix — Plan Pro.');
  lines.push('');

  return lines.join('\n');
}
