import Link from 'next/link';
import { NeedCard } from '@/components/board/NeedCard';
import { PitchCard } from '@/components/board/PitchCard';
import { Card, Empty, Section, Stat } from '@/components/ui';
import {
  boardNeeds,
  member,
  rankNeedsFor,
  readiness,
  task,
  weeklyPitch,
} from '@/lib/derive';
import { currentMemberId } from '@/lib/session';
import { dbFresh } from '@/lib/store';

export default async function BoardPage() {
  const data = dbFresh();
  const memberId = await currentMemberId();
  const current = member(data, memberId);
  const pitch = weeklyPitch(data, memberId);
  const pitchTask = pitch ? task(data, pitch.taskId) : undefined;
  const pitchNeed = pitchTask
    ? data.needs.find((need) => need.id === pitchTask.needId)
    : undefined;
  const needs = rankNeedsFor(data, memberId, boardNeeds(data));
  const now = +new Date();
  const met = data.needs.filter(
    (need) =>
      need.status === 'done' &&
      new Date(need.createdAt).getTime() >= now - 30 * 864e5,
  );
  const snapshot = readiness(data);

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Hamilton, Montana
      </h1>
      <p className="mb-8 text-sm text-stone-600">
        Everything on this board is something you can say yes to. There is no
        comment section.
      </p>

      <Section
        title="Your pitch this week"
        hint="A compact view of the promise you already made."
      >
        {pitchTask && pitchNeed ? (
          <PitchCard
            data={data}
            memberId={memberId}
            need={pitchNeed}
            task={pitchTask}
          />
        ) : (
          <p className="text-sm text-stone-600">
            No pitch yet.{' '}
            <Link className="underline" href="/pitch">
              Choose one on My pitch.
            </Link>
          </p>
        )}
      </Section>

      <Section
        title="Open needs"
        hint="Sorted by urgency and fit — not recency."
        action={
          <Link className="text-xs font-medium underline" href="/needs/new">
            Post a need
          </Link>
        }
      >
        {needs.length === 0 ? (
          <Empty>Nothing open right now.</Empty>
        ) : (
          <div className="space-y-3">
            {needs.map((need) => (
              <NeedCard
                key={need.id}
                data={data}
                need={need}
                memberId={memberId}
                current={current}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Met this month"
        hint="Proof of neighbors showing up, not a stream of chatter."
      >
        {met.length === 0 ? (
          <Empty>No completed needs in the last 30 days.</Empty>
        ) : (
          <div className="space-y-2">
            {met.map((need) => (
              <Card key={need.id}>
                <Link
                  href={`/reports/${need.id}`}
                  className="font-medium underline"
                >
                  {need.title}
                </Link>
                {need.publishConsent ? (
                  <p className="mt-1 text-sm text-stone-600">
                    Requested by {member(data, need.requesterId)?.name ?? 'a neighbor'}.
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Neighborhood readiness"
        hint="A quick read on whether the town can respond."
        action={
          <Link className="text-xs font-medium underline" href="/readiness">
            Full readiness
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Ready this week"
            value={String(snapshot.membersReadyThisWeek)}
          />
          <Stat label="Needs open" value={String(snapshot.needsOpen)} />
          <Stat
            label="Met this month"
            value={String(snapshot.needsMetThisMonth)}
          />
          <Stat
            label="Town show-rate"
            value={
              snapshot.townShowRate === null
                ? '—'
                : `${Math.round(snapshot.townShowRate * 100)}%`
            }
          />
        </div>
      </Section>
    </>
  );
}
