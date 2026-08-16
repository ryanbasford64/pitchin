import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { dbFresh, id, write } from '@/lib/store';
import type { Database, NeedUrgency, NeedVisibility } from '@/lib/types';

const TOWN_CENTER = { lat: 46.2469, lng: -114.1591 };

/** Places a new ask near its neighborhood's existing needs so it plots on the town map. */
function townPoint(data: Database, neighborhood: string): { lat: number; lng: number } {
  const nearby = data.needs.filter((item) => item.neighborhood === neighborhood && item.lat !== 0);
  if (nearby.length === 0) return TOWN_CENTER;
  return {
    lat: nearby.reduce((sum, item) => sum + item.lat, 0) / nearby.length,
    lng: nearby.reduce((sum, item) => sum + item.lng, 0) / nearby.length,
  };
}

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
      ...townPoint(data, requester.neighborhood || current.neighborhood),
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
