import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AnalyticsEventType } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { generateLetterMirror, type LetterMirrorInput } from '@/lib/ai';
import { LETTER_TONES, inferLetterRune } from '@/config/letters';
import { logAnalyticsEvent } from '@/lib/analytics';

const mirrorSchema = z.object({
  jobTitle: z.string().min(2, 'Renseigne un titre de poste valide.'),
  company: z.string().min(2, "Le nom de l’entreprise est requis."),
  tone: z.enum(LETTER_TONES),
  language: z.enum(['fr', 'en']).default('fr'),
  highlights: z.array(z.string().min(3)).min(1),
  resumeSummary: z.string().min(20, 'Ajoute un résumé de parcours plus détaillé.'),
});

type MirrorPayload = z.infer<typeof mirrorSchema>;

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let payload: MirrorPayload;
  try {
    const body = await request.json();
    payload = mirrorSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Paramètres invalides', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Requête illisible' }, { status: 400 });
  }

  try {
    const mirrorInput: LetterMirrorInput = {
      jobTitle: payload.jobTitle,
      company: payload.company,
      tone: payload.tone,
      language: payload.language,
      highlights: payload.highlights,
      resumeSummary: payload.resumeSummary,
    };

    const mirror = await generateLetterMirror(mirrorInput, { userId: session.user.id });

    const runeInference = inferLetterRune({
      keywords: mirror.keywords,
      tone: payload.tone,
      textBlocks: [mirror.mirror, payload.resumeSummary, payload.highlights.join(' ')],
    });

    await logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.LETTER_MIRROR_REQUESTED,
      metadata: {
        tone: payload.tone,
        language: payload.language,
        rune: runeInference.rune.id,
        keywords: mirror.keywords,
        confidence: runeInference.confidence,
      },
    });

    return NextResponse.json({
      mirror: mirror.mirror,
      keywords: mirror.keywords,
      emotionalSpectrum: mirror.emotionalSpectrum,
      energyPulse: mirror.energyPulse ?? null,
      rune: {
        id: runeInference.rune.id,
        label: runeInference.rune.label,
        description: runeInference.rune.description,
        confidence: runeInference.confidence,
        matchedKeywords: runeInference.matchedKeywords,
      },
    });
  } catch (error) {
    console.error('[LETTER_MIRROR]', error);
    void logAnalyticsEvent({
      userId: session.user.id,
      type: AnalyticsEventType.LETTER_MIRROR_FAILED,
      metadata: {
        tone: payload.tone,
        language: payload.language,
        message: error instanceof Error ? error.message : 'unknown_error',
      },
    });
    return NextResponse.json({ message: 'Impossible de générer un miroir pour l’instant.' }, { status: 500 });
  }
}
