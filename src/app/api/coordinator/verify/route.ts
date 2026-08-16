import { NextResponse } from 'next/server';
import { currentMember } from '@/lib/session';
import { write } from '@/lib/store';

class VerifyError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
  }
}

export async function POST(request: Request) {
  const actor = await currentMember();
  const body = await request.json() as { commitmentId?: unknown; showed?: unknown };
  if (typeof body.commitmentId !== 'string' || typeof body.showed !== 'boolean') return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  try {
    write((data) => {
      const commitment = data.commitments.find((item) => item.id === body.commitmentId);
      if (!commitment) throw new VerifyError('commitment not found', 404);
      const need = data.needs.find((item) => item.id === commitment.needId);
      const task = data.tasks.find((item) => item.id === commitment.taskId);
      if (!need || !task) throw new VerifyError('related record not found', 404);
      if (actor.id !== need.requesterId && !actor.isCoordinator) throw new VerifyError('requester or coordinator only', 403);
      if (actor.id === commitment.memberId) throw new VerifyError('helpers cannot verify themselves', 403);
      if (commitment.status !== 'committed') throw new VerifyError('commitment already resolved', 409);
      const now = new Date().toISOString();
      commitment.status = body.showed ? 'kept' : 'no_show';
      commitment.verifiedBy = actor.id;
      commitment.verifiedAt = now;
      const member = data.members.find((item) => item.id === commitment.memberId);
      if (member) {
        if (body.showed) member.commitmentsKept++;
        else member.noShows++;
      }
      const taskCommitments = data.commitments.filter((item) => item.taskId === task.id && item.status !== 'declined');
      if (taskCommitments.length > 0 && taskCommitments.every((item) => item.status === 'kept' || item.status === 'no_show')) {
        const kept = taskCommitments.filter((item) => item.status === 'kept').length;
        task.status = kept >= task.quorum ? 'done' : 'unmet';
      }
      const needTasks = data.tasks.filter((item) => item.needId === need.id);
      const resolved = needTasks.length > 0 && needTasks.every((item) => item.status === 'done' || item.status === 'unmet');
      if (resolved) need.status = needTasks.every((item) => item.status === 'done') ? 'done' : 'unmet';
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof VerifyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'verification failed' }, { status: 400 });
  }
}
