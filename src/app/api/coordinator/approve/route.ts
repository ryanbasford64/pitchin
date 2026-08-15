import { NextResponse } from 'next/server';
import { id, write } from '@/lib/store';
import { ALL_CAPABILITIES, ALL_QUALS } from '@/lib/derive';
import type { Capability, Qual } from '@/lib/types';
import type { TaskDraft } from '@/app/coordinator/propose';

function validDraft(value: unknown): value is TaskDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<TaskDraft>;
  const minutes = draft.minutes;
  const quorum = draft.quorum;
  return typeof draft.title === 'string' && draft.title.trim().length > 0 &&
    typeof minutes === 'number' && Number.isInteger(minutes) && minutes > 0 &&
    typeof quorum === 'number' && Number.isInteger(quorum) && quorum > 0 &&
    Array.isArray(draft.capabilities) && draft.capabilities.every((x) => ALL_CAPABILITIES.includes(x as Capability)) &&
    Array.isArray(draft.quals) && draft.quals.every((x) => ALL_QUALS.includes(x as Qual)) &&
    Array.isArray(draft.materiel) && draft.materiel.every((x) => typeof x === 'string') &&
    typeof draft.scheduledFor === 'string' && !Number.isNaN(Date.parse(draft.scheduledFor));
}

export async function POST(request: Request) {
  const body = await request.json() as { needId?: unknown; tasks?: unknown };
  if (typeof body.needId !== 'string' || !Array.isArray(body.tasks) || body.tasks.length === 0 || !body.tasks.every(validDraft)) {
    return NextResponse.json({ error: 'invalid need or task drafts' }, { status: 400 });
  }
  try {
    const result = write((data) => {
      const need = data.needs.find((item) => item.id === body.needId);
      if (!need) throw new Error('need not found');
      if (need.status === 'done' || need.status === 'cancelled') throw new Error('need is closed');
      const created = (body.tasks as TaskDraft[]).map((draft) => {
        const task = { id: id('task'), needId: need.id, ...draft, status: 'open' as const, claimedBy: [] };
        data.tasks.push(task);
        return task.id;
      });
      need.taskIds = [...need.taskIds, ...created];
      need.status = 'open';
      return created;
    });
    return NextResponse.json({ ok: true, taskIds: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'approval failed' }, { status: 400 });
  }
}
