import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderMarkdownToPdf } from '@/lib/pdf';

const exportSchema = z.object({
  draftId: z.string().optional(),
  resume: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = exportSchema.parse(body);

    let markdown = parsed.resume ?? null;

    if (!markdown && parsed.draftId) {
      const draft = await prisma.resumeDraft.findFirst({
        where: {
          id: parsed.draftId,
          userId: session.user.id,
        },
      });

      if (!draft) {
        return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
      }

      const draftContent = draft.content as { resumeMarkdown?: string } | null;
      markdown = draftContent?.resumeMarkdown ?? null;
    }

    if (!markdown) {
      return NextResponse.json({ message: 'No resume content available' }, { status: 400 });
    }

    const pdfBuffer = await renderMarkdownToPdf(markdown);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="phoenix-cv.pdf"',
      },
    });
  } catch (error) {
    console.error('[CV_EXPORT]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Unable to export CV' }, { status: 500 });
  }
}
