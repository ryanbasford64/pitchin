// Derived read models. Pure functions over the Database so every slice computes the
// same numbers the same way.
import type {
  Capability,
  Commitment,
  Crew,
  Database,
  Member,
  Need,
  NeedResolution,
  Qual,
  ReadinessSnapshot,
  ShowRate,
  Task,
} from './types';

export const ALL_CAPABILITIES: Capability[] = [
  'truck', 'trailer', 'chainsaw', 'generator', 'pump', 'ladder', 'snowblower', 'tools',
  'cooking', 'childcare', 'driving', 'heavy_lifting', 'spanish', 'asl', 'medical', 'clerical',
];

export const ALL_QUALS: Qual[] = [
  'chainsaw_operator', 'pump_operator', 'interpreter_spanish', 'wildfire_prep',
  'elder_checkin', 'meeting_minutes', 'first_aid',
];

export function label(value: string): string {
  return value.replace(/_/g, ' ');
}

export function member(data: Database, id: string): Member | undefined {
  return data.members.find((x) => x.id === id);
}

export function memberName(data: Database, id: string): string {
  return member(data, id)?.name ?? 'Unknown neighbor';
}

export function task(data: Database, id: string): Task | undefined {
  return data.tasks.find((x) => x.id === id);
}

export function need(data: Database, id: string): Need | undefined {
  return data.needs.find((x) => x.id === id);
}

export function tasksForNeed(data: Database, needId: string): Task[] {
  return data.tasks.filter((x) => x.needId === needId);
}

export function crewOf(data: Database, memberId: string): Crew | undefined {
  return data.crews.find((c) => c.memberIds.includes(memberId));
}

/** Show-rate: commitments kept over commitments made. Not hours logged. */
export function showRate(m: Member): ShowRate {
  const made = m.commitmentsMade;
  const kept = m.commitmentsKept;
  return { made, kept, rate: made === 0 ? null : kept / made };
}

export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

/** A task launches only at quorum. Below it, nobody shows up alone. */
export function atQuorum(t: Task): boolean {
  return t.claimedBy.length >= t.quorum;
}

export function stillNeeded(t: Task): number {
  return Math.max(0, t.quorum - t.claimedBy.length);
}

/** The single commitment a member holds for the current pitch week. */
export function weeklyPitch(data: Database, memberId: string): Commitment | undefined {
  const weekStart = new Date(`${data.weekOf}T00:00:00.000Z`).getTime();
  const weekEnd = weekStart + 7 * 864e5;
  return data.commitments.find((c) => {
    if (c.memberId !== memberId || !c.isWeeklyPitch) return false;
    if (c.status === 'declined') return false;
    const t = task(data, c.taskId);
    if (!t) return false;
    const when = new Date(t.scheduledFor).getTime();
    return when >= weekStart && when < weekEnd;
  });
}

/**
 * How long the current ask should be. A missed week does not earn a lecture — it
 * shrinks the ask until the member can keep it.
 */
export function askMinutes(m: Member): number {
  if (m.noShows >= 3) return 5;
  if (m.noShows === 2) return 10;
  return 20;
}

export const RESOLUTION_LABEL: Record<NeedResolution, string> = {
  solved: 'the problem was handled',
  partly: 'partly handled',
  not_solved: 'not handled',
};

export function resolutionTone(resolution: NeedResolution): 'good' | 'warn' | 'alert' {
  if (resolution === 'solved') return 'good';
  return resolution === 'partly' ? 'warn' : 'alert';
}

/** Closed either way: the town staffed it, or the town failed to field it. */
export function closedNeeds(data: Database): Need[] {
  return data.needs.filter((n) => n.status === 'done' || n.status === 'unmet');
}

export function personMinutes(data: Database, needId: string): number {
  return data.commitments
    .filter((c) => c.needId === needId && c.status === 'kept')
    .reduce((sum, c) => sum + (task(data, c.taskId)?.minutes ?? 0), 0);
}

/**
 * Why the town did not field a need, stated as a capacity fact. Never a helper's name:
 * an unmet need is a failure of the town, not of a neighbor who declined.
 */
export function unmetReasons(data: Database, needId: string): { title: string; reason: string }[] {
  const active = data.members.filter((m) => !m.paused);
  return tasksForNeed(data, needId)
    .filter((t) => t.status === 'unmet' || !atQuorum(t))
    .map((t) => ({ title: t.title, reason: reasonFor(t) }));

  function reasonFor(t: Task): string {
    const missing = [
      ...t.capabilities.filter((cap) => !active.some((m) => m.capabilities.includes(cap))),
      ...t.quals.filter((q) => !active.some((m) => m.quals.some((g) => g.qual === q))),
    ].map(label);
    if (missing.length) return `nobody on the registry can field ${missing.join(' or ')}`;
    const kept = data.commitments.filter((c) => c.taskId === t.id && c.status === 'kept').length;
    if (t.claimedBy.length === 0) {
      return `nobody claimed it; ${t.quorum} ${t.quorum === 1 ? 'was' : 'were'} needed`;
    }
    if (!atQuorum(t)) return `below quorum — ${t.quorum} needed, ${t.claimedBy.length} claimed`;
    return `${t.claimedBy.length} claimed it, ${kept} showed, quorum was ${t.quorum}`;
  }
}

export function openNeeds(data: Database): Need[] {
  return data.needs.filter((n) => n.status === 'open' || n.status === 'staffed');
}

/** Needs visible on the public Board. Private asks never appear here. */
export function boardNeeds(data: Database): Need[] {
  return openNeeds(data).filter((n) => n.visibility === 'neighborhood');
}

/** Ranked by urgency and by fit to this member's capabilities — never by recency. */
export function rankNeedsFor(data: Database, memberId: string, needs: Need[]): Need[] {
  const m = member(data, memberId);
  const urgencyWeight = { surge: 400, urgent: 300, soon: 200, routine: 100 } as const;
  return [...needs].sort((a, b) => score(b) - score(a));

  function score(n: Need): number {
    let s = urgencyWeight[n.urgency];
    if (!m) return s;
    const caps = new Set(tasksForNeed(data, n.id).flatMap((t) => t.capabilities));
    const overlap = [...caps].filter((c) => m.capabilities.includes(c)).length;
    s += overlap * 25;
    const short = tasksForNeed(data, n.id).some((t) => !atQuorum(t));
    if (short) s += 40;
    return s;
  }
}

export function readiness(data: Database): ReadinessSnapshot {
  const active = data.members.filter((m) => !m.paused);
  const capabilityCounts: Record<string, number> = {};
  for (const cap of ALL_CAPABILITIES) {
    capabilityCounts[cap] = active.filter((m) => m.capabilities.includes(cap)).length;
  }
  const qualCounts: Record<string, number> = {};
  for (const q of ALL_QUALS) {
    qualCounts[q] = active.filter((m) => m.quals.some((g) => g.qual === q)).length;
  }
  const gaps = [
    ...ALL_QUALS.filter((q) => qualCounts[q] <= 1).map((q) => `only ${qualCounts[q]} ${label(q)}`),
    ...ALL_CAPABILITIES.filter((c) => capabilityCounts[c] === 0).map((c) => `no ${label(c)}`),
  ];

  const monthAgo = Date.now() - 30 * 864e5;
  const thisMonth = data.needs.filter((n) => new Date(n.createdAt).getTime() >= monthAgo);
  const needsMetThisMonth = thisMonth.filter((n) => n.status === 'done').length;
  const closedThisMonth = thisMonth.filter((n) => n.status === 'done' || n.status === 'unmet');
  const needsResolvedThisMonth = closedThisMonth.filter(
    (n) => n.resolution?.resolution === 'solved',
  ).length;
  const needsPartlyResolvedThisMonth = closedThisMonth.filter(
    (n) => n.resolution?.resolution === 'partly',
  ).length;
  const needsUnmetThisMonth = thisMonth.filter((n) => n.status === 'unmet').length;
  const needsAwaitingResolution = closedThisMonth.filter((n) => !n.resolution).length;

  const made = data.members.reduce((sum, m) => sum + m.commitmentsMade, 0);
  const kept = data.members.reduce((sum, m) => sum + m.commitmentsKept, 0);

  return {
    membersReadyThisWeek: active.length,
    membersTotal: data.members.length,
    capabilityCounts,
    qualCounts,
    gaps,
    needsMetThisMonth,
    needsResolvedThisMonth,
    needsPartlyResolvedThisMonth,
    needsUnmetThisMonth,
    needsAwaitingResolution,
    needsOpen: openNeeds(data).length,
    townShowRate: made === 0 ? null : kept / made,
  };
}

/** Capabilities and quals an open task needs that the town cannot currently field. */
export function capabilityGaps(data: Database): { task: Task; missing: string[] }[] {
  const active = data.members.filter((m) => !m.paused);
  const out: { task: Task; missing: string[] }[] = [];
  for (const t of data.tasks) {
    if (t.status !== 'open') continue;
    const missing: string[] = [];
    for (const cap of t.capabilities) {
      if (!active.some((m) => m.capabilities.includes(cap))) missing.push(label(cap));
    }
    for (const q of t.quals) {
      if (!active.some((m) => m.quals.some((g) => g.qual === q))) missing.push(label(q));
    }
    if (missing.length) out.push({ task: t, missing });
  }
  return out;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
