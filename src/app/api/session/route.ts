import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/store';
import { MEMBER_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  const body = (await request.json()) as { memberId?: string };
  const memberId = body.memberId;
  if (!memberId || !db().members.some((m) => m.id === memberId)) {
    return NextResponse.json({ error: 'unknown member' }, { status: 400 });
  }
  const store = await cookies();
  store.set(MEMBER_COOKIE, memberId, { httpOnly: true, sameSite: 'lax', path: '/' });
  return NextResponse.json({ ok: true, memberId });
}
