import { NextResponse } from 'next/server';
import { currentMember } from '@/lib/session';
import { dbFresh, write } from '@/lib/store';
import { sweepUnmetNeeds } from '@/lib/sweep';

export async function POST() {
  const actor = await currentMember();
  if (!actor.isCoordinator) {
    return NextResponse.json({ error: 'coordinator only' }, { status: 403 });
  }
  dbFresh();
  const swept = write((data) => sweepUnmetNeeds(data).map((need) => need.title));
  return NextResponse.json({ ok: true, swept });
}
