import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getEnergyHistory } from '@/lib/energy';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const takeParam = url.searchParams.get('take');
  const take = takeParam ? Math.max(1, Math.min(200, Number.parseInt(takeParam, 10) || 50)) : 50;

  const history = await getEnergyHistory(session.user.id, take);
  return NextResponse.json({ history });
}
