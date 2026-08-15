import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { dbFresh, id, write } from '@/lib/store';

export async function POST(request: Request) {
  const body = (await request.json()) as { taskId?: string };
  const memberId = await currentMemberId();
  dbFresh();
  const result = write((data) => {
    const task = data.tasks.find((item) => item.id === body.taskId);
    if (!task) return { error: 'unknown task', status: 400 as const };
    const need = data.needs.find((item) => item.id === task.needId);
    const member = data.members.find((item) => item.id === memberId);
    if (!need || !member) return { error: 'unknown task', status: 400 as const };
    if (need.visibility === 'private') return { error: 'private needs cannot be claimed here', status: 409 as const };
    if (need.status !== 'open' && need.status !== 'staffed') return { error: 'this need is not open', status: 409 as const };
    if (task.claimedBy.includes(memberId)) return { error: 'you already have this one', status: 409 as const };
    if (task.claimedBy.length >= task.quorum) return { error: 'already staffed', status: 409 as const };

    const now = new Date().toISOString();
    task.claimedBy.push(memberId);
    member.commitmentsMade += 1;
    data.commitments.push({
      id: id('cmt'),
      memberId,
      taskId: task.id,
      needId: need.id,
      committedAt: now,
      isWeeklyPitch: false,
      status: 'committed',
      verifiedBy: null,
      verifiedAt: null,
    });
    if (task.claimedBy.length >= task.quorum) task.status = 'staffed';
    const needTasks = data.tasks.filter((item) => item.needId === need.id);
    if (needTasks.every((item) => item.status === 'staffed' || item.status === 'done')) need.status = 'staffed';
    return {
      ok: true,
      taskStatus: task.status,
      stillNeeded: Math.max(0, task.quorum - task.claimedBy.length),
    };
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
