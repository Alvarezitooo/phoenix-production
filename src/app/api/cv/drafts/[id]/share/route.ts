import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAppBaseUrl } from '@/lib/stripe';
import { resolveCvTheme, CvThemeKey } from '@/config/cv';

const schema = z.object({
  share: z.boolean(),
  theme: z.enum(['FEU', 'EAU', 'TERRE', 'AIR', 'ETHER']).optional(),
});

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

function generateSlug() {
  return Math.random().toString(36).slice(2, 10);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const params = await context.params;
  const draftId = params?.id;
  if (!draftId || Array.isArray(draftId)) {
    return NextResponse.json({ message: 'Draft id missing' }, { status: 400 });
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: 'Bad request' }, { status: 400 });
  }

  const draft = await prisma.resumeDraft.findFirst({
    where: { id: draftId, userId: session.user.id },
  });

  if (!draft) {
    return NextResponse.json({ message: 'Draft not found' }, { status: 404 });
  }

  const theme = payload.theme ?? (draft.theme as CvThemeKey | null) ?? resolveCvTheme(draft.element ?? undefined);

  if (!payload.share) {
    const updated = await prisma.resumeDraft.update({
      where: { id: draft.id },
      data: {
        isShared: false,
        shareSlug: null,
        theme,
      },
    });
    return NextResponse.json({
      ok: true,
      shared: false,
      draftId: updated.id,
    });
  }

  const slug = draft.shareSlug ?? generateSlug();

  const updated = await prisma.resumeDraft.update({
    where: { id: draft.id },
    data: {
      isShared: true,
      shareSlug: slug,
      theme,
    },
  });

  const baseUrl = getAppBaseUrl();
  const shareUrl = `${baseUrl}/cv/share/${updated.shareSlug}`;

  return NextResponse.json({
    ok: true,
    shared: true,
    draftId: updated.id,
    theme,
    shareSlug: updated.shareSlug,
    shareUrl,
  });
}
