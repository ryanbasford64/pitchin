import Link from 'next/link';
import {
  RESOLUTION_LABEL,
  closedNeeds,
  formatWhen,
  personMinutes,
  readiness,
  resolutionTone,
  unmetReasons,
} from '@/lib/derive';
import { dbFresh } from '@/lib/store';
import type { Database, Need } from '@/lib/types';
import { Card, Empty, Section, Stat, Tag } from '@/components/ui';

export default function LedgerPage() {
  const data = dbFresh();
  const snapshot = readiness(data);
  const closed = closedNeeds(data).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const listable = closed.filter((need) => need.visibility === 'neighborhood');
  const withheld = closed.length - listable.length;
  const met = listable.filter((need) => need.status === 'done');
  const unmet = listable.filter((need) => need.status === 'unmet');

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">The record</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          What Hamilton was asked for, what it fielded, and what it did not. Staffing a job is
          not the same as solving a problem, so both are on the record.
        </p>
      </div>

      <Section title="This month">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Needs staffed" value={String(snapshot.needsMetThisMonth)} hint="tasks closed out" />
          <Stat
            label="Problems solved"
            value={String(snapshot.needsResolvedThisMonth)}
            hint="the requester said so"
          />
          <Stat label="Not fielded" value={String(snapshot.needsUnmetThisMonth)} hint="unmet" />
          <Stat
            label="No answer yet"
            value={String(snapshot.needsAwaitingResolution)}
            hint="closed, outcome unknown"
          />
        </div>
      </Section>

      <Section
        title="What the town did not field"
        hint="Published on purpose. A town that hides its misses cannot fix them."
      >
        {unmet.length === 0 ? (
          <Empty>Nothing has gone unmet.</Empty>
        ) : (
          <div className="space-y-3">
            {unmet.map((need) => (
              <Card key={need.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{need.title}</div>
                  <Tag tone="alert">unmet</Tag>
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {need.neighborhood} · needed by{' '}
                  {need.neededBy ? formatWhen(need.neededBy) : 'when possible'}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-stone-700">
                  {unmetReasons(data, need.id).map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}</strong> — {item.reason}.
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/reports/${need.id}`}
                  className="mt-3 inline-block text-xs text-stone-700 underline"
                >
                  full record →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="What the town met" hint="Turnout on the left, the requester's answer on the right.">
        {met.length === 0 ? (
          <Empty>No needs have closed out yet.</Empty>
        ) : (
          <div className="space-y-3">
            {met.map((need) => (
              <Card key={need.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{need.title}</div>
                  {need.resolution ? (
                    <Tag tone={resolutionTone(need.resolution.resolution)}>
                      {RESOLUTION_LABEL[need.resolution.resolution]}
                    </Tag>
                  ) : (
                    <Tag tone="warn">no answer from the requester yet</Tag>
                  )}
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {need.neighborhood} · {turnout(data, need)} neighbors ·{' '}
                  {personMinutes(data, need.id)} person-minutes
                </div>
                {need.resolution?.note ? (
                  <p className="mt-2 border-l-2 border-stone-300 pl-3 text-sm">
                    {need.resolution.note}
                  </p>
                ) : null}
                <Link
                  href={`/reports/${need.id}`}
                  className="mt-3 inline-block text-xs text-stone-700 underline"
                >
                  full record →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {withheld > 0 ? (
        <p className="text-xs text-stone-500">
          {withheld} closed {withheld === 1 ? 'ask is' : 'asks are'} private or crews-only and are
          counted above but not listed here.
        </p>
      ) : null}
    </>
  );
}

function turnout(data: Database, need: Need): number {
  return new Set(
    data.commitments
      .filter((commitment) => commitment.needId === need.id && commitment.status === 'kept')
      .map((commitment) => commitment.memberId),
  ).size;
}
