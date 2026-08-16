import { currentMember } from '@/lib/session';
import { ALL_QUALS } from '@/lib/derive';
import { db, id, write } from '@/lib/store';
import { revalidatePath } from 'next/cache';
import type { Qual, Surge } from '@/lib/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isQual(value: unknown): value is Qual {
  return typeof value === 'string' && ALL_QUALS.includes(value as Qual);
}

function isResponse(value: unknown): value is 'yes' | 'no' {
  return value === 'yes' || value === 'no';
}

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Request body must be valid JSON.');
  }
  if (!isRecord(body) || typeof body.action !== 'string') return error('A valid surge action is required.');

  const viewer = await currentMember();
  const memberId = viewer.id;
  if (body.action === 'declare') {
    if (!viewer.isCoordinator) return error('Only a coordinator can declare a surge.', 403);
    if (typeof body.name !== 'string' || !body.name.trim()) return error('A surge name is required.');
    if (!Array.isArray(body.quals) || body.quals.length === 0 || !body.quals.every(isQual)) {
      return error('Choose at least one valid required qual.');
    }
    const name = body.name.trim();
    const quals = [...new Set(body.quals)] as Qual[];
    const active = db().surges.find((surge) => surge.standDownAt === null);
    if (active) return error('Stand down the active surge before declaring another one.', 409);
    const surge = write((data): Surge => {
      const rollCall = data.members
        .filter((member) => !member.paused && member.quals.some((grant) => quals.includes(grant.qual)))
        .map((member) => ({ memberId: member.id, response: 'pending' as const, respondedAt: null }));
      const next: Surge = {
        id: id('surge'),
        name,
        declaredAt: new Date().toISOString(),
        declaredBy: memberId,
        quals,
        standDownAt: null,
        rollCall,
      };
      data.surges.push(next);
      return next;
    });
    revalidatePath('/surge');
    return Response.json({ surge });
  }

  if (body.action === 'respond') {
    if (typeof body.surgeId !== 'string' || !isResponse(body.response)) {
      return error('A surge and a yes/no response are required.');
    }
    if (typeof body.memberId === 'string' && body.memberId !== memberId && !viewer.isCoordinator) {
      return error('You can only answer a roll call for yourself.', 403);
    }
    const surgeId = body.surgeId;
    const response = body.response;
    const answerFor = typeof body.memberId === 'string' ? body.memberId : memberId;
    const surge = write((data) => {
      const found = data.surges.find((item) => item.id === surgeId);
      if (!found) return undefined;
      if (found.standDownAt !== null) return null;
      const row = found.rollCall.find((item) => item.memberId === answerFor);
      if (!row) return null;
      row.response = response;
      row.respondedAt = new Date().toISOString();
      return found;
    });
    if (!surge) return error('That roll-call row is not available.', 404);
    revalidatePath('/surge');
    return Response.json({ surge });
  }

  if (body.action === 'stand_down') {
    if (!viewer.isCoordinator) return error('Only a coordinator can stand down a surge.', 403);
    if (typeof body.surgeId !== 'string') return error('A surge id is required.');
    const surge = write((data) => {
      const found = data.surges.find((item) => item.id === body.surgeId);
      if (!found) return undefined;
      if (found.standDownAt === null) found.standDownAt = new Date().toISOString();
      return found;
    });
    if (!surge) return error('Surge not found.', 404);
    revalidatePath('/surge');
    return Response.json({ surge });
  }

  return error('Unknown surge action.');
}
