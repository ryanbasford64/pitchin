// The Board is the home surface. Not a feed: every item here is claimable.
// Slice A owns this file and fleshes it out.
import Link from 'next/link';
import { Card, Empty, Section, Stat, Tag } from '@/components/ui';
import { ClaimButton } from '@/components/board/ClaimButton';
import { approximateStreet, shortText, taskForMember } from '@/components/board/helpers';
import { boardNeeds, formatWhen, member, rankNeedsFor, readiness, stillNeeded, task, tasksForNeed, weeklyPitch } from '@/lib/derive';
import { currentMemberId } from '@/lib/session';
import { db } from '@/lib/store';

export default async function BoardPage() {
  const data = db();
  const memberId = await currentMemberId();
  const current = member(data, memberId);
  const pitch = weeklyPitch(data, memberId);
  const pitchTask = pitch ? task(data, pitch.taskId) : undefined;
  const pitchNeed = pitchTask ? data.needs.find((need) => need.id === pitchTask.needId) : undefined;
  const needs = rankNeedsFor(data, memberId, boardNeeds(data));
  const now = +new Date();
  const met = data.needs.filter((need) => need.status === 'done' && new Date(need.createdAt).getTime() >= now - 30 * 864e5);
  const snapshot = readiness(data);

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hamilton, Montana</h1>
      <p className="mb-8 text-sm text-stone-600">
        Everything on this board is something you can say yes to. There is no comment section.
      </p>

      <Section title="Your pitch this week" hint="A compact view of the promise you already made.">
        {pitchTask && pitchNeed ? (
          <Card><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-medium">{pitchTask.title}</h3><p className="mt-1 text-xs text-stone-500">{formatWhen(pitchTask.scheduledFor)} · {pitchNeed.street}</p><p className="mt-2 text-sm">Paired with {pitchTask.claimedBy.filter((id) => id !== memberId).map((id) => member(data, id)?.name).filter(Boolean).join(', ') || 'the rest of your crew'}.</p><p className="mt-1 text-xs text-stone-500">Bring: {pitchTask.materiel.length ? pitchTask.materiel.join(', ') : 'nothing to bring'}.</p></div><Tag tone="good">committed</Tag></div></Card>
        ) : <p className="text-sm text-stone-600">No pitch yet. <Link className="underline" href="/pitch">Choose one on My pitch.</Link></p>}
      </Section>

      <Section title="Open needs" hint="Sorted by urgency and fit — not recency." action={<Link className="text-xs font-medium underline" href="/needs/new">Post a need</Link>}>
        {needs.length === 0 ? <Empty>Nothing open right now.</Empty> : (
          <div className="space-y-3">{needs.map((need) => {
            const tasks = tasksForNeed(data, need.id);
            const openTasks = tasks.filter((item) => item.status === 'open');
            const still = openTasks.reduce((sum, item) => sum + stillNeeded(item), 0);
            const claimTask = taskForMember(data, need, memberId);
            const matches = [...new Set(tasks.flatMap((item) => item.capabilities).filter((capability) => current?.capabilities.includes(capability)))];
            return <Card key={need.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{need.title}</h3><Tag tone={need.urgency === 'surge' || need.urgency === 'urgent' ? 'alert' : need.urgency === 'soon' ? 'warn' : 'neutral'}>{need.urgency}</Tag></div><p className="mt-1 text-sm text-stone-600">{shortText(need.rawText)}</p><p className="mt-2 text-xs text-stone-500">{formatWhen(tasks[0]?.scheduledFor ?? need.createdAt)} · {approximateStreet(need.street)}</p><p className="mt-1 text-xs text-stone-600">{tasks.map((item) => item.title).join(' · ')}</p><p className="mt-1 text-sm font-medium">{still ? `needs ${still} more${openTasks.some((item) => stillNeeded(item) > 0 && item.quorum > 1) ? ' — this one does not run until the group commits' : ''}` : 'fully staffed'}</p>{matches.length ? <p className="mt-1 text-xs text-stone-500">Matches what you have: {matches.join(', ')}</p> : null}</div><div className="flex shrink-0 flex-col items-start gap-2">{claimTask ? <ClaimButton taskId={claimTask.id} /> : <span className="text-xs text-stone-500">No open task fits right now</span>}<Link href={`/needs/${need.id}`} className="text-xs underline">See the tasks</Link></div></div></Card>;
          })}</div>
        )}
      </Section>

      <Section title="Met this month" hint="Proof of neighbors showing up, not a stream of chatter.">
        {met.length === 0 ? <Empty>No completed needs in the last 30 days.</Empty> : <div className="space-y-2">{met.map((need) => <Card key={need.id}><Link href={`/reports/${need.id}`} className="font-medium underline">{need.title}</Link>{need.publishConsent ? <p className="mt-1 text-sm text-stone-600">Requested by {member(data, need.requesterId)?.name ?? 'a neighbor'}.</p> : null}</Card>)}</div>}
      </Section>

      <Section title="Neighborhood readiness" hint="A quick read on whether the town can respond.">
        <Link href="/readiness" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ready this week" value={String(snapshot.membersReadyThisWeek)} />
          <Stat label="Needs open" value={String(snapshot.needsOpen)} />
          <Stat label="Met this month" value={String(snapshot.needsMetThisMonth)} />
          <Stat label="Town show-rate" value={snapshot.townShowRate === null ? '—' : `${Math.round(snapshot.townShowRate * 100)}%`} />
        </Link>
      </Section>
    </>
  );
}
