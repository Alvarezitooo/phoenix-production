import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderMarkdownToPdf } from '@/lib/pdf';

const exportSchema = z.object({
  letter: z.string().optional(),
  draftId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = exportSchema.parse(await request.json());

    let markdown = payload.letter ?? null;

    if (!markdown && payload.draftId) {
      const draft = await prisma.letterDraft.findFirst({
        where: {
          id: payload.draftId,
          userId: session.user.id,
        },
      });

      if (!draft) {
        return NextResponse.json({ message: 'Letter draft not found' }, { status: 404 });
      }

      const content = draft.content as { letterMarkdown?: string } | null;
      markdown = content?.letterMarkdown ?? null;
    }

    if (!markdown) {
      return NextResponse.json({ message: 'No letter content provided' }, { status: 400 });
    }

    const pdfBuffer = await renderMarkdownToPdf(markdown);
    const pdfBody = pdfBuffer instanceof Uint8Array ? Buffer.from(pdfBuffer) : pdfBuffer;

    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="phoenix-letter.pdf"',
      },
    });
  } catch (error) {
    console.error('[LETTER_EXPORT]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to export letter' }, { status: 500 });
  }
}
