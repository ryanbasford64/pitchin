import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { id, write } from '@/lib/store';
import { pitchCandidate } from '../logic';

export async function POST(request: Request) {
  const body = (await request.json()) as { taskId?: string };
  const taskId = body.taskId;
  const memberId = await currentMemberId();
  if (!taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 });

  const result = write((data) => {
    const candidate = pitchCandidate(data, memberId);
    const selected = data.tasks.find((task) => task.id === taskId);
    if (!selected || !candidate || candidate.id !== taskId) {
      return { error: 'that pitch is no longer available' };
    }
    data.commitments.push({
      id: id('cmt'),
      memberId,
      taskId,
      needId: selected.needId,
      committedAt: new Date().toISOString(),
      isWeeklyPitch: true,
      status: 'declined',
      verifiedBy: null,
      verifiedAt: null,
    });
    return { ok: true, taskId };
  });

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
