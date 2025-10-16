import { z } from 'zod';

export const letterMirrorSchema = z.object({
  mirror: z.string().min(60),
  keywords: z.array(z.string().min(1)).min(3).max(8),
  emotionalSpectrum: z.array(z.string().min(1)).min(3).max(5),
  energyPulse: z.string().optional().nullable(),
});

export type LetterMirrorPayload = z.infer<typeof letterMirrorSchema>;

export function parseLetterMirrorResponse(raw: string): LetterMirrorPayload {
  try {
    const parsed = JSON.parse(raw);
    return letterMirrorSchema.parse(parsed);
  } catch (error) {
    const fallback = raw.replace(/^```(?:json)?/g, '').replace(/```$/g, '').trim();
    const parsed = (() => {
      try {
        return JSON.parse(fallback);
      } catch {
        return null;
      }
    })();

    if (parsed) {
      return letterMirrorSchema.parse(parsed);
    }

    const roughKeywords = fallback
      .split(/[,.;\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .slice(0, 5);

    const keywords = roughKeywords.length >= 3 ? roughKeywords : [...roughKeywords, 'alignement', 'impact', 'confiance'].slice(0, 5);

    return letterMirrorSchema.parse({
      mirror: fallback,
      keywords,
      emotionalSpectrum: ['douceur', 'engagement', 'élan'],
      energyPulse: null,
    });
  }
}
