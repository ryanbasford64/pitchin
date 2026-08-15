import Link from 'next/link';
import { capabilityGaps, formatRate, label, readiness, showRate } from '@/lib/derive';
import { db } from '@/lib/store';
import { Card, Empty, Section, Stat, Tag } from '@/components/ui';
import { ResetDemo } from '@/components/readiness/ResetDemo';
import { TownMap } from '@/components/readiness/TownMap';

function inventory(counts: Record<string, number>) {
  return Object.entries(counts);
}

export default function ReadinessPage() {
  const data = db();
  const snapshot = readiness(data);
  const publicNeeds = data.needs.filter((need) => (need.status === 'open' || need.status === 'staffed') && need.visibility === 'neighborhood');
  const publicNeedIds = new Set(publicNeeds.map((need) => need.id));
  const gaps = capabilityGaps(data).filter(({ task }) => publicNeedIds.has(task.needId));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What Hamilton can field</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">A plain-language readiness picture for this week: people, equipment, and the gaps that keep a job from launching.</p>
        </div>
        <ResetDemo />
      </div>

      <Section title="Headline stats">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ready this week" value={`${snapshot.membersReadyThisWeek} of ${snapshot.membersTotal}`} />
          <Stat label="Needs open" value={String(snapshot.needsOpen)} />
          <Stat label="Needs met this month" value={String(snapshot.needsMetThisMonth)} />
          <Stat label="Town show-rate" value={formatRate(snapshot.townShowRate)} />
        </div>
      </Section>

      <Section title="Capability inventory" hint="Counts are active members with the capability or qualification on record.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold">Capabilities</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {inventory(snapshot.capabilityCounts).map(([key, count]) => (
                <Tag key={key} tone={count === 0 ? 'warn' : count === 1 ? 'alert' : 'neutral'}>
                  {count > 0 ? `${count} ${label(key)}` : `none on record: ${label(key)}`}{count === 1 ? ' — single point of failure' : ''}
                </Tag>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-500">No capability listed means none on record; member-held supply is registered town-wide, not geocoded to a neighborhood.</p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Qualifications</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(snapshot.qualCounts).map(([key, count]) => (
                <Tag key={key} tone={count === 0 ? 'warn' : count === 1 ? 'alert' : 'neutral'}>
                  {count > 0 ? `${count} ${label(key)}` : `none on record: ${label(key)}`}{count === 1 ? ' — single point of failure' : ''}
                </Tag>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Gaps" hint="A gap is a practical limit, not a score.">
        {snapshot.gaps.length === 0 && gaps.length === 0 ? <Empty>No current fielding gaps.</Empty> : (
          <div className="space-y-2 text-sm text-stone-700">
            {snapshot.gaps.map((gap) => <p key={gap}>The town has {gap}, so that capacity is thin or unavailable.</p>)}
            {gaps.map(({ task, missing }) => (
              <p key={task.id}><strong>{task.title}</strong> is missing {missing.join(' and ')}; it cannot launch until someone can field {missing.join(' and ')}.</p>
            ))}
          </div>
        )}
      </Section>

      <Section title="Crew standings" action={<Link href="/crews" className="text-xs font-medium underline">See crews</Link>}>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.crews.map((crew) => {
            const crewMembers = data.members.filter((member) => crew.memberIds.includes(member.id));
            const made = crewMembers.reduce((sum, member) => sum + showRate(member).made, 0);
            const kept = crewMembers.reduce((sum, member) => sum + showRate(member).kept, 0);
            return (
              <Card key={crew.id}>
                <div className="font-medium">{crew.name}</div>
                <div className="mt-1 text-xs text-stone-500">{crewMembers.length} members · {crew.streakWeeks}-week streak</div>
                <div className="mt-3 text-2xl font-semibold">{formatRate(made === 0 ? null : kept / made)}</div>
                <div className="text-xs text-stone-500">aggregate show-rate</div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Supply map" hint="Needs are mapped; member addresses are intentionally not.">
        <TownMap needs={publicNeeds} tasks={data.tasks} members={data.members} />
      </Section>
    </>
  );
}
