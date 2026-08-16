import { NextResponse } from 'next/server';
import { currentMember } from '@/lib/session';
import { dbFresh, write } from '@/lib/store';
import type { NeedResolution } from '@/lib/types';

const RESOLUTIONS: NeedResolution[] = ['solved', 'partly', 'not_solved'];

function isResolution(value: unknown): value is NeedResolution {
  return typeof value === 'string' && RESOLUTIONS.includes(value as NeedResolution);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: needId } = await context.params;
  const body = (await request.json()) as { resolution?: unknown; note?: unknown };
  if (!isResolution(body.resolution)) {
    return NextResponse.json({ error: 'invalid resolution' }, { status: 400 });
  }
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
  const actor = await currentMember();
  dbFresh();
  const result = write((data) => {
    const need = data.needs.find((item) => item.id === needId);
    if (!need) return { error: 'unknown need', status: 400 as const };
    // The requester owns this answer. A coordinator may write down what they were told.
    const allowed =
      actor.id === need.requesterId || actor.id === need.postedById || actor.isCoordinator;
    if (!allowed) {
      return { error: 'only the requester or a coordinator can record an outcome', status: 403 as const };
    }
    if (need.status !== 'done' && need.status !== 'unmet') {
      return { error: 'the work on this need is not closed out yet', status: 409 as const };
    }
    if (need.resolution) return { error: 'an outcome is already on the record', status: 409 as const };
    // Deliberately does not touch any member's show-rate. Whether the problem got solved
    // is a fact about the town, not a grade on the people who turned up.
    need.resolution = {
      resolution: body.resolution as NeedResolution,
      note,
      recordedBy: actor.id,
      onBehalfOfRequester: actor.id !== need.requesterId,
      recordedAt: new Date().toISOString(),
    };
    return { ok: true };
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
