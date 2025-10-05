'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { logLunaInteraction } from '@/utils/luna-analytics';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';

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

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 z-40 shadow-lg"
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
        <MessageCircle className="h-4 w-4" />
        Luna
      </Button>
      <div
        className={`fixed bottom-24 right-6 z-50 flex h-[480px] w-96 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl transition-all duration-200 ${
          isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0'
        }`}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Luna</h3>
              <p className="text-xs text-white/60">Assistant IA contextuel</p>
            </div>
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
