import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { write } from '@/lib/store';

export async function POST(request: Request) {
  const body = (await request.json()) as { paused?: boolean };
  const paused = body.paused;
  if (typeof paused !== 'boolean') {
    return NextResponse.json({ error: 'paused must be a boolean' }, { status: 400 });
  }
  const memberId = await currentMemberId();
  const result = write((data) => {
    const current = data.members.find((member) => member.id === memberId);
    if (!current) return { error: 'unknown member' };
    current.paused = paused;
    return { ok: true, paused: current.paused };
  });

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
