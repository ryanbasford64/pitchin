// The MVP has no accounts. "Who am I" is a cookie plus a member switcher, so a
// walkthrough can move between a helper, a requester and a coordinator.
import 'server-only';
import { cookies } from 'next/headers';
import { db } from './store';
import type { Member } from './types';

export const MEMBER_COOKIE = 'pitchin_member';
export const DEFAULT_MEMBER_ID = 'mem_marcus';

export async function currentMemberId(): Promise<string> {
  const store = await cookies();
  const id = store.get(MEMBER_COOKIE)?.value;
  if (id && db().members.some((m) => m.id === id)) return id;
  return DEFAULT_MEMBER_ID;
}

export async function currentMember(): Promise<Member> {
  const id = await currentMemberId();
  const found = db().members.find((m) => m.id === id);
  if (!found) throw new Error(`No member ${id}`);
  return found;
}
