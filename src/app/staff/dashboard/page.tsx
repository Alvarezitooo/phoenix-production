import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import { isStaffSession } from '@/lib/staff';
import { getStaffDashboardSnapshot } from '@/lib/analytics-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function StaffDashboardPage() {
  const session = await getAuthSession();
  if (!isStaffSession(session)) {
    redirect('/');
  }

  const snapshot = await getStaffDashboardSnapshot();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-10">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Phoenix Ops</p>
          <h1 className="text-3xl font-semibold text-white">Tableau de bord interne</h1>
          <p className="text-sm text-white/60">Visibilité instantanée sur l’énergie, les achats packs et l’activité portails.</p>
        </div>
        <div className="flex gap-2 text-xs text-white/60">
          <Link href="/staff/letters" className="rounded-full border border-white/15 px-4 py-2 transition hover:border-emerald-400/50 hover:text-emerald-100">
            Modération lettres
          </Link>
          <Link href="/energy" className="rounded-full border border-white/15 px-4 py-2 transition hover:border-emerald-400/50 hover:text-emerald-100">
            Boutique énergie
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Utilisateurs</CardTitle>
            <CardDescription>Comptes actifs sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-white">{snapshot.energy.users}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Énergie totale</CardTitle>
            <CardDescription>Solde cumulé des wallets</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-white">{snapshot.energy.totalEnergy.toLocaleString('fr-FR')} pts</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Énergie moyenne</CardTitle>
            <CardDescription>Points disponibles par utilisateur</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-white">{snapshot.energy.averageEnergy} pts</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Streak ≥ 3 jours</CardTitle>
            <CardDescription>Utilisateurs réguliers</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-white">{snapshot.energy.streakThreePlus}</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Dépenses récentes</CardTitle>
            <CardDescription>Dernières actions énergie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            {snapshot.recentSpending.length === 0 ? (
              <p className="text-xs text-white/50">Aucune dépense récente.</p>
            ) : (
              snapshot.recentSpending.map((tx) => (
                <div key={tx.id} className="border-b border-white/10 pb-2 last:border-none last:pb-0">
                  <div className="flex items-center justify-between text-white">
                    <span>{tx.user}</span>
                    <span className="text-emerald-200">-{tx.amount} pts</span>
                  </div>
                  <p className="text-xs text-white/50">{tx.action ?? 'action inconnue'} • solde {tx.balanceAfter} pts</p>
                  <p className="text-[11px] text-white/40">{formatDate(tx.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Pack énergie</CardTitle>
            <CardDescription>Performances des 7 derniers jours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            <div className="flex items-center justify-between text-white">
              <span>Acheteurs sur 7 jours</span>
              <span className="text-lg font-semibold">{snapshot.packs.purchases7d}</span>
            </div>
            <div className="flex items-center justify-between text-white">
              <span>Revenu estimé</span>
              <span className="text-lg font-semibold">{formatCurrencyFromCents(snapshot.packs.revenue7dCents)}</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-white/50">Derniers achats</p>
              {snapshot.packs.latest.length === 0 ? (
                <p className="text-xs text-white/50">Aucun achat enregistré.</p>
              ) : (
                snapshot.packs.latest.map((purchase) => (
                  <div key={purchase.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-white">
                      <span>{purchase.user}</span>
                      <span className="text-xs text-white/50">{formatDate(purchase.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/60">Pack : {purchase.packId}</p>
                    <p className="text-xs text-emerald-200">
                      {purchase.amountCents ? formatCurrencyFromCents(purchase.amountCents) : 'Montant N/A'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Activité portails (7 jours)</CardTitle>
            <CardDescription>Compréhension rapide de l’engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-wide text-white/50">Lettres publiées</p>
                <p className="mt-1 text-2xl font-semibold text-white">{snapshot.activity.lettersPublished7d}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-wide text-white/50">Rituels complétés</p>
                <p className="mt-1 text-2xl font-semibold text-white">{snapshot.activity.ritualsCompleted7d}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-wide text-white/50">Analyses Aube terminées</p>
                <p className="mt-1 text-2xl font-semibold text-white">{snapshot.activity.assessmentsCompleted7d}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Surveillance énergie</CardTitle>
            <CardDescription>Utilisateurs avec solde faible</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            {snapshot.health.lowEnergyUsers.length === 0 ? (
              <p className="text-xs text-white/50">Tous les utilisateurs ont plus de 15 points d’énergie.</p>
            ) : (
              snapshot.health.lowEnergyUsers.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div>
                    <p className="text-white">{entry.user}</p>
                    <p className="text-[11px] text-white/50">
                      Dernière activité : {entry.lastActionAt ? formatDate(entry.lastActionAt) : 'inconnue'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-rose-200">{entry.balance} pts</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Utilisateurs dormants</CardTitle>
            <CardDescription>Dernière action &gt; 7 jours</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-white">{snapshot.health.dormantUsers7d}</p>
            <p className="mt-1 text-sm text-white/60">Planifier un parcours de relance ciblé.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Constellation</CardTitle>
            <CardDescription>Évènements récents (Aube, Rise, Lettres)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-white/70">
            {snapshot.constellations.length === 0 ? (
              <p className="text-xs text-white/50">Aucun événement enregistré pour l’instant.</p>
            ) : (
              snapshot.constellations.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                  {event.label}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Workers</CardTitle>
            <CardDescription>Dernières exécutions (rappels, constellations)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            {snapshot.workers.length === 0 ? (
              <p className="text-xs text-white/50">Aucun worker enregistré.</p>
            ) : (
              snapshot.workers.map((run) => (
                <div key={run.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-white">
                    <span>{run.worker}</span>
                    <span className="text-[11px] text-white/40">{formatDate(run.createdAt)}</span>
                  </div>
                  <p className="text-xs text-white/60">Traitements : {run.processed}</p>
                  {run.errors > 0 && <p className="text-xs text-rose-300">Erreurs : {run.errors}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
