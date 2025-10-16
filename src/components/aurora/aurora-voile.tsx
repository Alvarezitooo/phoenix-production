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

export function AuroraVoile({ sessionId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'aurora',
      content:
        'Bienvenue dans Le Voile.\n\nIci, on va parler de ce que tu ressens vraiment face à l\'intelligence artificielle.\n\nIl n\'y a ni bonne ni mauvaise réponse. Juste ce qui est vrai pour toi, maintenant.\n\nQuand tu penses à l\'IA, **quel est le premier mot** qui te vient ?',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [firstWord, setFirstWord] = useState('');
  const [face, setFace] = useState('');
  const [mainFear, setMainFear] = useState('');
  const [aspiration, setAspiration] = useState('');

  const sendMessage = async (message: string, context?: any) => {
    if (!message.trim() && !context) return;

    setLoading(true);

    // Ajoute le message utilisateur
    const userMessage = message.trim();
    if (userMessage) {
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    }

    try {
      const res = await fetch('/api/aurora/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage: userMessage || 'continue',
          chamber: 'voile',
          context,
        }),
      });

      const data = await res.json();

      // Ajoute la réponse IA
      setMessages((prev) => [...prev, { role: 'aurora', content: data.aiResponse }]);
      setUserInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Submit = async () => {
    if (!userInput.trim()) return;
    setFirstWord(userInput);
    await sendMessage(userInput, { firstWord: userInput });
    setStep(1);
  };

  const handleStep2Submit = async () => {
    if (!userInput.trim()) return;
    setFace(userInput);
    await sendMessage(userInput, { face: userInput });
    setStep(2);
  };

  const handleFearSelect = async (fear: string) => {
    setMainFear(fear);
    await sendMessage(`Qu'est-ce qui t'inquiète le plus : ${fear}`, { mainFear: fear });
    setStep(3);
  };

  const handleAspirationSelect = async (asp: string) => {
    setAspiration(asp);
    await sendMessage(`Si l'IA devenait ton alliée : ${asp}`, {
      aspiration: asp,
      firstWord,
      face,
      mainFear,
    });
    setStep(4);
  };

  const handleFinishVoile = () => {
    onComplete();
  };

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <span className="text-2xl">🌫️</span>
          Le Voile
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
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
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
                Aurora réfléchit...
              </div>
            </div>
          )}
        </div>

        {/* Input selon l'étape */}
        {step === 0 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleStep1Submit()}
              placeholder="Ton premier mot..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
              disabled={loading}
            />
            <Button
              onClick={handleStep1Submit}
              disabled={loading || !userInput.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && !loading && (
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleStep2Submit()}
              placeholder="Un robot ? Un collègue ? Un outil ?"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
              disabled={loading}
            />
            <Button
              onClick={handleStep2Submit}
              disabled={loading || !userInput.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && !loading && (
          <div className="space-y-2">
            <p className="text-sm text-white/70">Qu'est-ce qui t'inquiète le plus avec l'IA ?</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleFearSelect('Perdre mon emploi')}
              >
                Perdre mon emploi
              </Button>
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleFearSelect('Ne pas comprendre comment ça marche')}
              >
                Ne pas comprendre comment ça marche
              </Button>
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleFearSelect('Les dérives éthiques')}
              >
                Les dérives éthiques (surveillance, biais)
              </Button>
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleFearSelect('Être dépassé·e technologiquement')}
              >
                Être dépassé·e technologiquement
              </Button>
            </div>
          </div>
        )}

        {step === 3 && !loading && (
          <div className="space-y-2">
            <p className="text-sm text-white/70">
              Si l'IA devenait ton alliée, qu'est-ce qu'elle t'aiderait à faire ?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleAspirationSelect('Gagner du temps sur des tâches répétitives')}
              >
                Gagner du temps sur des tâches répétitives
              </Button>
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleAspirationSelect('Apprendre de nouvelles compétences')}
              >
                Apprendre de nouvelles compétences
              </Button>
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() => handleAspirationSelect('Être plus créatif·ve')}
              >
                Être plus créatif·ve
              </Button>
              <Button
                variant="outline"
                className="justify-start border-white/10 bg-white/5 text-white hover:bg-amber-500/20"
                onClick={() =>
                  handleAspirationSelect('Mieux comprendre des sujets complexes')
                }
              >
                Mieux comprendre des sujets complexes
              </Button>
            </div>
          </div>
        )}

        {step === 4 && !loading && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="text-sm text-white/90">
                Ton profil a été enregistré. Tu es prêt·e pour la Chambre suivante !
              </p>
            </div>
            <Button
              onClick={handleFinishVoile}
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              Continuer vers L'Atelier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
