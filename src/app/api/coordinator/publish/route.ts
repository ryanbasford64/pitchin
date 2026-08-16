import { NextResponse } from 'next/server';
import { currentMember } from '@/lib/session';
import { id, write } from '@/lib/store';

export async function POST(request: Request) {
  const actor = await currentMember();
  if (!actor.isCoordinator) return NextResponse.json({ error: 'coordinator only' }, { status: 403 });
  const body = await request.json() as { needId?: unknown; whatWorked?: unknown; whatWeWouldChange?: unknown; wordFromRequester?: unknown };
  if (typeof body.needId !== 'string' || typeof body.whatWorked !== 'string' || typeof body.whatWeWouldChange !== 'string') return NextResponse.json({ error: 'invalid report' }, { status: 400 });
  try {
    write((data) => {
      const need = data.needs.find((item) => item.id === body.needId);
      if (!need) throw new Error('need not found');
      const tasks = data.tasks.filter((item) => item.needId === need.id);
      if (!tasks.length || !tasks.every((item) => item.status === 'done')) throw new Error('all tasks must be done');
      if (data.reports.some((report) => report.needId === need.id)) throw new Error('report already exists');
      const whatWorked = body.whatWorked;
      const whatWeWouldChange = body.whatWeWouldChange;
      if (typeof whatWorked !== 'string' || typeof whatWeWouldChange !== 'string') throw new Error('invalid report text');
      const commitments = data.commitments.filter((item) => item.needId === need.id && item.status === 'kept');
      data.reports.push({
        id: id('aar'), needId: need.id, publishedAt: new Date().toISOString(), whatWasNeeded: need.rawText,
        turnout: [...new Set(commitments.map((item) => item.memberId))],
        personMinutes: tasks.reduce((sum, task) => sum + task.minutes * commitments.filter((item) => item.taskId === task.id).length, 0),
        materielUsed: [...new Set(tasks.flatMap((task) => task.materiel))],
        whatWorked, whatWeWouldChange,
        wordFromRequester: need.publishConsent && typeof body.wordFromRequester === 'string' ? body.wordFromRequester : null,
      });
      need.status = 'done';
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'publish failed' }, { status: 400 });
  }
}
