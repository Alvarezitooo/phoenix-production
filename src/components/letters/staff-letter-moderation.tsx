'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/utils/cn';

type LetterPublicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type StaffLetterModerationPublication = {
  id: string;
  status: LetterPublicationStatus;
  isAnonymous: boolean;
  excerpt: string | null;
  runeId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  moderatedAt: string | null;
  moderationNote: string | null;
  energySpent: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  draft: {
    title: string | null;
    mirrorText: string | null;
    mirrorKeywords: string[];
    mirrorEmotions: string[];
  };
};

type StaffLetterModerationTableProps = {
  initialPublications: StaffLetterModerationPublication[];
};

const STATUS_LABELS: Record<LetterPublicationStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Publié',
  REJECTED: 'Rejetée',
};

const STATUS_CLASSES: Record<LetterPublicationStatus, string> = {
  PENDING: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  APPROVED: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  REJECTED: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
};

const FILTERS: Array<{ id: 'ALL' | LetterPublicationStatus; label: string }> = [
  { id: 'PENDING', label: 'En attente' },
  { id: 'ALL', label: 'Toutes' },
  { id: 'APPROVED', label: 'Publiées' },
  { id: 'REJECTED', label: 'Rejetées' },
];

export function StaffLetterModerationTable({ initialPublications }: StaffLetterModerationTableProps) {
  const [publications, setPublications] = useState(initialPublications);
  const [filter, setFilter] = useState<'ALL' | LetterPublicationStatus>('PENDING');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const filteredPublications = useMemo(() => {
    if (filter === 'ALL') return publications;
    return publications.filter((item) => item.status === filter);
  }, [publications, filter]);

  const pendingCount = useMemo(
    () => publications.filter((item) => item.status === 'PENDING').length,
    [publications],
  );

  async function moderatePublication(id: string, nextStatus: LetterPublicationStatus) {
    let note: string | undefined;
    if (nextStatus === 'REJECTED') {
      note = window.prompt('Note interne pour expliquer le rejet (visible pour l’équipe et l’utilisateur) ?')?.trim();
      if (!note) {
        showToast({
          title: 'Note requise',
          description: 'Merci de renseigner une note de retour pour l’utilisateur.',
          variant: 'info',
        });
        return;
      }
    }

    setProcessingId(id);
    try {
      const response = await fetch(`/api/letters/publications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            publication?: {
              status: LetterPublicationStatus;
              moderatedAt: string | null;
              moderationNote: string | null;
              publishedAt: string | null;
            };
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Action impossible');
      }

      const publication = payload?.publication as {
        status: LetterPublicationStatus;
        moderatedAt: string | null;
        moderationNote: string | null;
        publishedAt: string | null;
      };

      if (!publication) {
        throw new Error('Réponse inattendue du serveur');
      }

      setPublications((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                status: publication.status,
                moderatedAt: publication.moderatedAt,
                moderationNote: publication.moderationNote,
                publishedAt: publication.publishedAt,
              }
            : item,
        ),
      );

      showToast({
        title: nextStatus === 'APPROVED' ? 'Lettre publiée' : 'Lettre rejetée',
        description:
          nextStatus === 'APPROVED'
            ? 'La lettre apparaîtra dans la galerie dans les prochaines minutes.'
            : 'Le membre sera notifié du retour Luna Ops.',
        variant: nextStatus === 'APPROVED' ? 'success' : 'info',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action impossible';
      showToast({ title: 'Erreur modération', description: message, variant: 'error' });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Luna Ops</p>
          <h1 className="text-2xl font-semibold text-white">Modération Letters</h1>
          <p className="text-sm text-white/60">
            {pendingCount} lettre{pendingCount > 1 ? 's' : ''} en attente. Vérifie l’extrait, les mots-clés et le ton avant d’approuver.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={filter === item.id ? 'secondary' : 'ghost'}
              className="text-xs"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      {filteredPublications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-white/60">
          Aucun élément dans ce filtre.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPublications.map((publication) => {
            const statusClass = STATUS_CLASSES[publication.status];
            const statusLabel = STATUS_LABELS[publication.status];
            const isProcessing = processingId === publication.id;

            return (
              <article
                key={publication.id}
                className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-lg shadow-slate-950/40"
              >
                <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn('text-[11px]', statusClass)}>{statusLabel}</Badge>
                      {publication.runeId && (
                        <Badge variant="outline" className="text-[11px] uppercase tracking-wide text-emerald-200/80">
                          Rune {publication.runeId}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      {publication.draft.title ?? 'Lettre sans titre'}
                    </h2>
                    <p className="text-xs text-white/50">
                      Proposé {new Date(publication.createdAt).toLocaleString()} •{' '}
                      {publication.isAnonymous
                        ? 'Auteur anonyme'
                        : publication.user.name ?? publication.user.email ?? publication.user.id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => moderatePublication(publication.id, 'REJECTED')}
                      disabled={isProcessing || publication.status === 'REJECTED'}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Rejeter
                    </Button>
                    <Button
                      type="button"
                      className="text-xs"
                      onClick={() => moderatePublication(publication.id, 'APPROVED')}
                      disabled={isProcessing || publication.status === 'APPROVED'}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Publier
                    </Button>
                  </div>
                </header>

                {publication.excerpt && (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    {publication.excerpt}
                  </p>
                )}

                {publication.draft.mirrorText && (
                  <details className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                    <summary className="cursor-pointer text-xs uppercase tracking-wide text-white/50">
                      Voir le miroir Luna
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                      {publication.draft.mirrorText}
                    </p>
                  </details>
                )}

                {(publication.draft.mirrorKeywords.length > 0 || publication.draft.mirrorEmotions.length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/60">
                    {publication.draft.mirrorKeywords.map((keyword) => (
                      <span key={keyword} className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                        {keyword}
                      </span>
                    ))}
                    {publication.draft.mirrorEmotions.length > 0 && (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                        Émotions : {publication.draft.mirrorEmotions.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                )}

                <footer className="mt-4 flex flex-col gap-2 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span>Énergie dépensée : {publication.energySpent} pts</span>
                    {publication.moderatedAt && (
                      <span>
                        Modéré le {new Date(publication.moderatedAt).toLocaleString()}
                      </span>
                    )}
                    {publication.publishedAt && (
                      <span>
                        Publié le {new Date(publication.publishedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {publication.moderationNote && (
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-rose-100">
                      Note : {publication.moderationNote}
                    </span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
