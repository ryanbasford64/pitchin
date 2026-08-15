import {
  atQuorum,
  crewOf,
  member,
  memberName,
  need,
  task,
  tasksForNeed,
} from '@/lib/derive';
import type { Commitment, Crew, Database, Task } from '@/lib/types';

const DAY_MS = 7 * 864e5;

export function weekBounds(data: Database): [number, number] {
  const start = new Date(`${data.weekOf}T00:00:00.000Z`).getTime();
  return [start, start + DAY_MS];
}

export function taskIsBeforeNow(candidate: Task): boolean {
  return Date.now() < new Date(candidate.scheduledFor).getTime();
}

export function declinedThisWeek(data: Database, memberId: string): Commitment[] {
  const [weekStart, weekEnd] = weekBounds(data);
  return data.commitments.filter((commitment) => {
    const committedAt = new Date(commitment.committedAt).getTime();
    return (
      commitment.memberId === memberId &&
      commitment.isWeeklyPitch &&
      commitment.status === 'declined' &&
      committedAt >= weekStart &&
      committedAt < weekEnd
    );
  });
}

export function pitchCandidate(data: Database, memberId: string): Task | null {
  const current = member(data, memberId);
  if (!current) return null;

  const [weekStart, weekEnd] = weekBounds(data);
  const earliest = Math.max(Date.now(), weekStart);
  const declined = new Set(declinedThisWeek(data, memberId).map((commitment) => commitment.taskId));
  const crew = crewOf(data, memberId);

  const candidates = data.tasks
    .map((candidate) => {
      const scheduled = new Date(candidate.scheduledFor).getTime();
      const taskNeed = need(data, candidate.needId);
      if (
        candidate.status !== 'open' ||
        scheduled <= earliest ||
        scheduled >= weekEnd ||
        candidate.claimedBy.includes(memberId) ||
        declined.has(candidate.id) ||
        !taskNeed ||
        (taskNeed.status !== 'open' && taskNeed.status !== 'staffed') ||
        taskNeed.visibility === 'private' ||
        (taskNeed.visibility === 'crews_only' && !crew) ||
        !candidate.quals.every((qual) => current.quals.some((grant) => grant.qual === qual)) ||
        (candidate.capabilities.length > 0 &&
          !candidate.capabilities.some((capability) => current.capabilities.includes(capability)))
      ) {
        return null;
      }

      const capabilityOverlap = candidate.capabilities.filter((capability) =>
        current.capabilities.includes(capability),
      ).length;
      const date = new Date(candidate.scheduledFor);
      const fitsAvailability = current.availability.some(
        (window) =>
          window.weekday === date.getUTCDay() &&
          date.getUTCHours() >= window.startHour &&
          date.getUTCHours() < window.endHour,
      );
      const score =
        capabilityOverlap * 10 +
        (fitsAvailability ? 5 : 0) +
        (!atQuorum(candidate) ? 3 : 0);
      return { candidate, score, scheduled };
    })
    .filter((entry): entry is { candidate: Task; score: number; scheduled: number } => entry !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.scheduled - b.scheduled ||
        a.candidate.id.localeCompare(b.candidate.id),
    );

  return candidates[0]?.candidate ?? null;
}

export function partnersFor(data: Database, candidate: Task, memberId: string): string[] {
  const partners = candidate.claimedBy
    .filter((claimantId) => claimantId !== memberId)
    .map((claimantId) => memberName(data, claimantId));
  if (partners.length > 0) return partners;

  const crew = crewOf(data, memberId);
  if (!crew || crew.leadId === memberId) return [];
  const lead = member(data, crew.leadId);
  return lead ? [`${lead.name} (crew lead)`] : [];
}

export function crewWeekOutcome(data: Database, crew: Crew): 'broken' | 'kept' | 'quiet' {
  const [weekStart, weekEnd] = weekBounds(data);
  const activeMembers = new Set(
    crew.memberIds
      .map((memberId) => member(data, memberId))
      .filter((current): current is NonNullable<typeof current> => current !== undefined && !current.paused)
      .map((current) => current.id),
  );
  let kept = false;

  for (const commitment of data.commitments) {
    if (!commitment.isWeeklyPitch || !activeMembers.has(commitment.memberId)) continue;
    const candidate = task(data, commitment.taskId);
    if (!candidate) continue;
    const scheduled = new Date(candidate.scheduledFor).getTime();
    if (scheduled < weekStart || scheduled >= weekEnd) continue;
    if (
      commitment.status === 'no_show' ||
      (commitment.status === 'committed' && scheduled < Date.now())
    ) {
      return 'broken';
    }
    if (commitment.status === 'kept') kept = true;
  }

  return kept ? 'kept' : 'quiet';
}

export interface WeekSummary {
  kept: number;
  noShows: number;
  crews: { name: string; outcome: 'broken' | 'kept' | 'quiet'; streakWeeks: number }[];
  weekOf: string;
}

export function resolveWeek(data: Database): WeekSummary {
  const [weekStart, weekEnd] = weekBounds(data);
  let kept = 0;
  let noShows = 0;

  for (const commitment of data.commitments) {
    if (commitment.status !== 'committed') continue;
    const candidate = task(data, commitment.taskId);
    if (!candidate) continue;
    const scheduled = new Date(candidate.scheduledFor).getTime();
    if (scheduled < weekStart || scheduled >= weekEnd) continue;

    const current = member(data, commitment.memberId);
    if (!current) continue;
    if (commitment.verifiedBy !== null) {
      commitment.status = 'kept';
      current.commitmentsKept++;
      kept++;
    } else {
      commitment.status = 'no_show';
      current.noShows++;
      noShows++;
    }
  }

  for (const candidate of data.tasks) {
    const scheduled = new Date(candidate.scheduledFor).getTime();
    if (scheduled < weekStart || scheduled >= weekEnd) continue;
    const keptCommitments = data.commitments.filter(
      (commitment) => commitment.taskId === candidate.id && commitment.status === 'kept',
    ).length;
    candidate.status = keptCommitments >= candidate.quorum ? 'done' : 'unmet';
  }

  for (const currentNeed of data.needs) {
    const needTasks = tasksForNeed(data, currentNeed.id);
    if (needTasks.length > 0 && needTasks.every((candidate) => candidate.status === 'done')) {
      currentNeed.status = 'done';
    }
  }

  const crews = data.crews.map((crew) => {
    const outcome = crewWeekOutcome(data, crew);
    if (outcome === 'kept') crew.streakWeeks++;
    if (outcome === 'broken') crew.streakWeeks = 0;
    return { name: crew.name, outcome, streakWeeks: crew.streakWeeks };
  });

  const nextWeek = new Date(`${data.weekOf}T00:00:00.000Z`);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  data.weekOf = nextWeek.toISOString().slice(0, 10);

  return { kept, noShows, crews, weekOf: data.weekOf };
}
