'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { logLunaInteraction } from '@/utils/luna-analytics';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { cn } from '@/utils/cn';

const fetchConversations = async () => {
  const response = await fetch('/api/conversations');
  if (!response.ok) throw new Error('Unable to load conversations');
  return response.json() as Promise<{ conversations: Conversation[] }>;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type Conversation = {
  id: string;
  messages: ConversationMessage[];
};

export function LunaSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [focusArea] = useState('general');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: isOpen,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (isOpen && !conversation && conversationsQuery.data?.conversations?.length) {
      setConversation(conversationsQuery.data.conversations[0]);
    }
  }, [isOpen, conversation, conversationsQuery.data]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ prompt?: string; source?: string }>;
      const prompt = custom.detail?.prompt ?? '';
      const source = custom.detail?.source ?? 'unknown';
      setIsOpen(true);
      setMessage(prompt);
      logLunaInteraction('sidebar_open_from_event', { source, hasPrompt: Boolean(prompt) });
    };

    window.addEventListener('phoenix:luna-open', handler as EventListener);
    return () => {
      window.removeEventListener('phoenix:luna-open', handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateFromViewport = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const delta = window.innerHeight - viewport.height;
      setIsKeyboardVisible(delta > 180);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) {
        setIsKeyboardVisible(false);
        return;
      }
      if (!(active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        setIsKeyboardVisible(false);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateFromViewport);
      window.visualViewport.addEventListener('scroll', updateFromViewport);
      updateFromViewport();
    }
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateFromViewport);
        window.visualViewport.removeEventListener('scroll', updateFromViewport);
      }
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const shouldLockScroll =
      isOpen && typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    if (shouldLockScroll) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [isOpen]);

  const sendMessage = useMutation({
    mutationFn: async (payload: { message: string; conversationId?: string; focusArea: string }) => {
      const response = await fetch('/api/luna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message ?? 'Unable to send message');
      }
      return response.json() as Promise<{ conversation: Conversation }>;
    },
    onSuccess: ({ conversation: updated }) => {
      setConversation(updated);
      setMessage('');
      logLunaInteraction('sidebar_message_sent', { focusArea });
    },
  });

  const messages = conversation?.messages ?? [];

  const floatingButtonVisible = useMemo(() => {
    if (typeof window === 'undefined') {
      return !isKeyboardVisible;
    }
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    return isDesktop || !isKeyboardVisible;
  }, [isKeyboardVisible]);

  return (
    <>
      {floatingButtonVisible && (
        <Button
          aria-expanded={isOpen}
          aria-controls="luna-sidebar"
          aria-label={isOpen ? 'Fermer Luna' : 'Ouvrir Luna'}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-1/2 z-40 flex h-12 w-12 -translate-x-1/2 items-center justify-center gap-2 rounded-full px-0 py-0 shadow-lg md:bottom-6 md:left-auto md:right-6 md:h-auto md:w-auto md:translate-x-0 md:px-5 md:py-2"
          variant="primary"
          onClick={() =>
            setIsOpen((prev) => {
              const next = !prev;
              if (next) {
                logLunaInteraction('sidebar_toggle_button', { source: 'floating_button' });
              }
              return next;
            })
          }
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden md:inline">Luna</span>
        </Button>
      )}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition md:hidden"
          aria-label="Fermer Luna"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        id="luna-sidebar"
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-50 mx-auto flex h-[min(90vh,520px)] max-w-[min(100vw-2rem,26rem)] transform-gpu flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl transition-all duration-200 md:bottom-24 md:right-6 md:left-auto md:mx-0 md:h-[480px] md:w-96',
          isOpen
            ? 'pointer-events-auto opacity-100 translate-y-0 md:translate-x-0'
            : 'pointer-events-none opacity-0 translate-y-4 md:translate-y-0 md:translate-x-4',
        )}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Luna</h3>
              <p className="text-xs text-white/60">Assistant IA contextuel</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs text-white transition hover:scale-100 hover:bg-white/20 md:hidden"
              onClick={() => setIsOpen(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="ml-auto hidden h-8 w-8 rounded-full text-white/70 transition hover:bg-white/10 hover:text-white md:inline-flex"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">Fermer Luna</span>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {sendMessage.isPending && (
            <div className="space-y-3">
              <Skeleton className="h-20" />
            </div>
          )}
          {messages.length === 0 && !sendMessage.isPending ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/60">
              Démarrez une conversation avec Luna pour affiner votre préparation d&apos;entretien ou clarifier vos pistes de carrière.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.timestamp + msg.role}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950'
                      : 'bg-white/8 text-white'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-white/10 p-5 space-y-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!message.trim()) return;
              sendMessage.mutate({
                message,
                conversationId: conversation?.id,
                focusArea,
              });
            }}
          >
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={3}
              placeholder="Posez votre question à Luna..."
            />
            <div className="flex items-center justify-end text-xs text-white/50">
              <Button type="submit" loading={sendMessage.isPending}>
                Envoyer
              </Button>
            </div>
          </form>
          <FeedbackWidget
            module="LUNA"
            context={{ conversationId: conversation?.id ?? null, messageCount: messages.length }}
            ctaLabel="Retour sur Luna"
            compact
          />
        </div>
      </div>
    </>
  );
}
