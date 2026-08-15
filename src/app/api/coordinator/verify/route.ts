import { NextResponse } from 'next/server';
import { currentMember } from '@/lib/session';
import { write } from '@/lib/store';

export async function POST(request: Request) {
  const actor = await currentMember();
  const body = await request.json() as { commitmentId?: unknown; showed?: unknown };
  if (typeof body.commitmentId !== 'string' || typeof body.showed !== 'boolean') return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  try {
    write((data) => {
      const commitment = data.commitments.find((item) => item.id === body.commitmentId);
      if (!commitment) throw new Response('commitment not found', { status: 404 });
      const need = data.needs.find((item) => item.id === commitment.needId);
      const task = data.tasks.find((item) => item.id === commitment.taskId);
      if (!need || !task) throw new Response('related record not found', { status: 404 });
      if (actor.id !== need.requesterId && !actor.isCoordinator) throw new Response('requester or coordinator only', { status: 403 });
      if (actor.id === commitment.memberId) throw new Response('helpers cannot verify themselves', { status: 403 });
      if (commitment.status !== 'committed') throw new Response('commitment already resolved', { status: 409 });
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
      if (taskCommitments.length > 0 && taskCommitments.every((item) => item.status === 'kept' || item.status === 'no_show')) task.status = 'done';
      const needTasks = data.tasks.filter((item) => item.needId === need.id);
      if (needTasks.length > 0 && needTasks.every((item) => item.status === 'done')) need.status = 'staffed';
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error instanceof NextResponse ? error : new NextResponse(error.statusText, { status: error.status });
    return NextResponse.json({ error: 'verification failed' }, { status: 400 });
  }
}
