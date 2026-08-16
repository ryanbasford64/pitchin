import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { write } from '@/lib/store';

export async function POST(request: Request) {
  const body = (await request.json()) as { commitmentId?: string };
  const commitmentId = body.commitmentId;
  const memberId = await currentMemberId();
  if (!commitmentId) {
    return NextResponse.json({ error: 'commitmentId is required' }, { status: 400 });
  }

  const result = write((data) => {
    const commitment = data.commitments.find(
      (candidate) =>
        candidate.id === commitmentId &&
        candidate.memberId === memberId &&
        candidate.status === 'committed',
    );
    if (!commitment) return { error: 'that commitment cannot be cancelled' };
    const selected = data.tasks.find((task) => task.id === commitment.taskId);
    if (!selected) return { error: 'task not found' };
    if (Date.now() >= new Date(selected.scheduledFor).getTime()) {
      return { error: 'The requester resolves it from here once the task has started.' };
    }

    commitment.status = 'declined';
    selected.claimedBy = selected.claimedBy.filter((claimantId) => claimantId !== memberId);
    if (selected.claimedBy.length < selected.quorum) selected.status = 'open';
    const current = data.members.find((member) => member.id === memberId);
    if (current) current.commitmentsMade = Math.max(0, current.commitmentsMade - 1);
    return { ok: true, commitmentId };
  });

  if ('error' in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
