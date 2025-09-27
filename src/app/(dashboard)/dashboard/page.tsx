import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Compass, FileText, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { CompatibilityBadge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/auth/sign-in');
  }

  const [user, assessments, matches, conversations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, subscriptionPlan: true, subscriptionStatus: true, currentPeriodEnd: true },
    }),
    prisma.assessment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.careerMatch.findMany({
      where: { userId: session.user.id },
      orderBy: { compatibilityScore: 'desc' },
      take: 3,
    }),
    prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">
            Bonjour {user?.name ?? 'Phénix'} ! Prêt·e à faire décoller votre carrière ?
          </h1>
          <p className="text-sm text-white/60">
            Suivez votre progression carrière, accédez aux modules IA et bénéficiez de recommandations personnalisées.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-sm text-white md:flex-row md:items-center">
          <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/10 px-6 py-3">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-white/50">Plan actif</span>
              <span className="text-lg font-semibold text-white">
                {user?.subscriptionPlan === 'PRO' ? 'Phoenix Pro' : 'Phoenix Essentiel'}
              </span>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user?.subscriptionStatus === 'ACTIVE'
                  ? 'border border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                  : 'border border-amber-400/50 bg-amber-500/10 text-amber-200'
              }`}
            >
              {user?.subscriptionStatus === 'ACTIVE' ? 'Actif' : 'À mettre à jour'}
            </span>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:shadow-xl"
          >
            Voir les offres
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommandations les plus compatibles</CardTitle>
            <CardDescription>Basées sur vos évaluations les plus récentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/60">
                Complétez l&apos;analyse Aube pour découvrir vos opportunités de carrière prioritaires.
              </div>
            ) : (
              matches.map((match) => (
                <div key={match.id} className="flex items-start justify-between rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{match.careerTitle}</h3>
                      <CompatibilityBadge value={Math.round(match.compatibilityScore)} />
                    </div>
                    <p className="mt-2 text-sm text-white/60">{match.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
                      {match.requiredSkills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full bg-white/10 px-3 py-1">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/aube?select=${match.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-white/10"
                  >
                    Choisir
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Vos 3 dernières actions dans Phoenix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs uppercase text-white/40">
                  <span>{assessment.mode === 'QUICK' ? 'Quick Analysis' : 'Complete Assessment'}</span>
                  <span>{assessment.status}</span>
                </div>
                <p className="mt-2 text-sm text-white/70">Statut: {assessment.status}</p>
              </div>
            ))}
            {conversations.map((conv) => (
              <div key={conv.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-white/40">
                  <MessageCircle className="h-4 w-4" /> Luna assistant
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {conv.messages && Array.isArray(conv.messages)
                    ? `${conv.messages.length} messages`
                    : 'Session démarrée'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Accès rapide aux modules</CardTitle>
            <CardDescription>Activez les fonctionnalités incluses dans votre abonnement Phoenix.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {[{
                title: 'Relancer Aube',
                description: 'Analyse psychométrique complète',
                href: '/aube',
                icon: Compass,
              }, {
                title: 'Optimiser mon CV',
                description: 'Générez un CV ciblé',
                href: '/cv-builder',
                icon: FileText,
              }, {
                title: 'Préparer une lettre',
                description: 'Créez une lettre motivée persuasive',
                href: '/letters',
                icon: FileText,
              }, {
                title: 'Session Luna',
                description: 'Simulez un entretien avec coaching IA',
                href: '/rise',
                icon: MessageCircle,
              }].map((item) => (
                <Link key={item.title} href={item.href} className="group flex items-center justify-between rounded-3xl border border-white/5 bg-white/5 p-5 transition hover:border-emerald-400/60 hover:bg-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="text-sm text-white/60">{item.description}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    <item.icon className="h-5 w-5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
