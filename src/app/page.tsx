// The Board is the home surface. Not a feed: every item here is claimable.
// Slice A owns this file and fleshes it out.
import { db } from '@/lib/store';
import { currentMemberId } from '@/lib/session';
import { boardNeeds, rankNeedsFor, readiness } from '@/lib/derive';
import { Empty, Section, Stat } from '@/components/ui';

export default async function BoardPage() {
  const data = db();
  const memberId = await currentMemberId();
  const needs = rankNeedsFor(data, memberId, boardNeeds(data));
  const snapshot = readiness(data);

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hamilton, Montana</h1>
      <p className="mb-8 text-sm text-stone-600">
        Everything on this board is something you can say yes to. There is no comment section.
      </p>

      <Section title="Open needs" hint="Sorted by urgency and by what you can actually do — never by recency.">
        {needs.length === 0 ? <Empty>Nothing open right now.</Empty> : (
          <ul className="space-y-2">
            {needs.map((n) => (
              <li key={n.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-stone-500">{n.street} · {n.urgency}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Neighborhood readiness">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ready this week" value={String(snapshot.membersReadyThisWeek)} />
          <Stat label="Needs open" value={String(snapshot.needsOpen)} />
          <Stat label="Met this month" value={String(snapshot.needsMetThisMonth)} />
          <Stat label="Town show-rate" value={snapshot.townShowRate === null ? '—' : `${Math.round(snapshot.townShowRate * 100)}%`} />
        </div>
      </Section>
    </>
  );
}
