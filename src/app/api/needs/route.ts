import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { dbFresh, id, write } from '@/lib/store';
import type { NeedUrgency, NeedVisibility } from '@/lib/types';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    rawText?: string;
    title?: string;
    urgency?: NeedUrgency;
    visibility?: NeedVisibility;
    onBehalfOfId?: string;
    onBehalfOfName?: string;
    consentGiven?: boolean;
    publishConsent?: boolean;
  };
  const memberId = await currentMemberId();
  dbFresh();
  const result = write((data) => {
    const current = data.members.find((member) => member.id === memberId);
    if (!current || !body.rawText?.trim()) return { error: 'Please describe what is needed.', status: 400 as const };
    const requester = body.onBehalfOfId
      ? data.members.find((member) => member.id === body.onBehalfOfId)
      : current;
    if (!requester) return { error: 'Choose a neighbor from the list.', status: 400 as const };
    if (body.onBehalfOfId && !body.consentGiven) {
      return { error: 'Consent is required when posting for a neighbor.', status: 400 as const };
    }
    const title = body.title?.trim() || body.rawText.trim().slice(0, 60);
    const now = new Date().toISOString();
    const need = {
      id: id('need'),
      title,
      rawText: body.rawText.trim(),
      requesterId: requester.id,
      postedById: body.onBehalfOfId ? memberId : null,
      neighborhood: requester.neighborhood || current.neighborhood,
      street: requester.street || current.street,
      lat: 0,
      lng: 0,
      visibility: body.visibility ?? 'neighborhood',
      urgency: body.urgency ?? 'routine',
      status: 'draft' as const,
      createdAt: now,
      neededBy: null,
      taskIds: [],
      publishConsent: body.publishConsent === true,
    };
    data.needs.push(need);
    return { ok: true, needId: need.id };
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result, { status: 201 });
}
