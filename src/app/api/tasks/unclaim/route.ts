import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { write } from '@/lib/store';

export async function POST(request: Request) {
  const body = (await request.json()) as { taskId?: string };
  const memberId = await currentMemberId();
  const result = write((data) => {
    const task = data.tasks.find((item) => item.id === body.taskId);
    if (!task) return { error: 'unknown task', status: 400 as const };
    const need = data.needs.find((item) => item.id === task.needId);
    const member = data.members.find((item) => item.id === memberId);
    if (!need || !member) return { error: 'unknown task', status: 400 as const };
    if (!task.claimedBy.includes(memberId)) return { error: 'you have not claimed this one', status: 409 as const };
    if (new Date(task.scheduledFor).getTime() < Date.now()) {
      return { error: 'this window has passed; it is now the requester’s verification territory', status: 409 as const };
    }

    task.claimedBy = task.claimedBy.filter((id) => id !== memberId);
    member.commitmentsMade = Math.max(0, member.commitmentsMade - 1);
    const commitment = [...data.commitments].reverse().find(
      (item) => item.memberId === memberId && item.taskId === task.id && item.status === 'committed',
    );
    if (commitment) commitment.status = 'declined';
    if (task.claimedBy.length < task.quorum) {
      task.status = 'open';
      if (need.status === 'staffed') need.status = 'open';
    }
    return { ok: true, taskStatus: task.status, stillNeeded: Math.max(0, task.quorum - task.claimedBy.length) };
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
