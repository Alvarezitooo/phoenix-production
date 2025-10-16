'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

type Props = {
  sessionId: string;
  onComplete: () => void;
};

type Message = {
  role: 'aurora' | 'user';
  content: string;
};

export function AuroraDialogue({ sessionId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'aurora',
      content:
        'Bienvenue au Dialogue.\n\nIci, on va apprendre à parler à une IA pour obtenir ce que tu veux vraiment.\n\n**Mission :** Aide-moi à rédiger l\'introduction d\'un email professionnel.\n\nLe contexte : tu dois relancer un client qui n\'a pas répondu depuis 2 semaines.\n\nEssaie une première fois. Dis-moi ce que tu veux que j\'écrive.',
    },
  ]);
  const [userInput, setUserInput] = useState('');

  const sendMessage = async (message: string, promptImprovement = false) => {
    if (!message.trim()) return;

    setLoading(true);

    // Ajoute le message utilisateur
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const res = await fetch('/api/aurora/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage: message,
          chamber: 'dialogue',
          context: { promptImprovement },
        }),
      });

      const data = await res.json();

      // Ajoute la réponse IA
      setMessages((prev) => [...prev, { role: 'aurora', content: data.aiResponse }]);
      setUserInput('');
      setStep((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    const isSecondAttempt = step >= 1;
    sendMessage(userInput, isSecondAttempt);
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <span className="text-2xl">💬</span>
          Le Dialogue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="space-y-4 rounded-lg bg-white/5 p-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-500/20 text-white'
                    : 'bg-white/10 text-white/90'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aurora génère...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {step < 2 && (
          <div className="space-y-2">
            {step === 1 && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                <p className="text-xs text-white/80">
                  <strong>Conseil :</strong> Donne-moi plus de contexte (ton, longueur,
                  objectif) pour que je puisse mieux t'aider.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                placeholder={
                  step === 0
                    ? "Ex: écris un mail de relance"
                    : "Ex: email amical mais pro, 3-4 lignes, objectif RDV cette semaine"
                }
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !userInput.trim()}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step >= 2 && !loading && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="mb-2 text-sm font-semibold text-white">
                Les 3 règles du bon prompt :
              </p>
              <ol className="space-y-1 text-xs text-white/80">
                <li>1. <strong>Sois précis</strong> — Plus tu donnes de contexte, mieux c'est</li>
                <li>2. <strong>Itère</strong> — Si le résultat ne te plaît pas, reformule</li>
                <li>3. <strong>Reste critique</strong> — Vérifie toujours ce que l'IA propose</li>
              </ol>
              <p className="mt-3 text-xs text-white/60">
                Badge débloqué : <strong>Apprenti prompt</strong> 💬 (+5 énergie)
              </p>
            </div>
            <Button
              onClick={handleFinish}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              Terminer le parcours Aurora
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
