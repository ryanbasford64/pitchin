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
    const current = data.members.find((member) => member.id === memberId);
    const candidate = pitchCandidate(data, memberId);
    const selected = data.tasks.find((task) => task.id === taskId);
    if (!current || !selected || !candidate || candidate.id !== taskId || selected.status !== 'open') {
      return { error: 'that pitch is no longer available' };
    }

    selected.claimedBy.push(memberId);
    if (selected.claimedBy.length >= selected.quorum) selected.status = 'staffed';
    current.commitmentsMade++;
    data.commitments.push({
      id: id('cmt'),
      memberId,
      taskId,
      needId: selected.needId,
      committedAt: new Date().toISOString(),
      isWeeklyPitch: true,
      status: 'committed',
      verifiedBy: null,
      verifiedAt: null,
    });
    return { ok: true, taskId };
  });

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
