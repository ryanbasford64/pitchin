import { crewOf, label, member, weeklyPitch } from '@/lib/derive';
import { currentMemberId } from '@/lib/session';
import { db } from '@/lib/store';
import { Card, Section, Tag } from '@/components/ui';
import { AdvanceWeekButton } from '@/components/pitch/PitchActions';

export default async function CrewsPage() {
  const data = db();
  const currentMemberIdValue = await currentMemberId();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Crews</h1>
        <p className="mt-1 text-sm text-stone-600">
          Week of {data.weekOf}. Crews carry the standing together; this is not a leaderboard.
        </p>
      </div>

      <Section title="Crew standings" hint="A hard month is carried by the crew rather than turned into shame.">
        <div className="grid gap-4 lg:grid-cols-3">
          {data.crews.map((crew) => {
            const isMine = crewOf(data, currentMemberIdValue)?.id === crew.id;
            const pitchCount = crew.memberIds.filter((memberId) => {
              const current = member(data, memberId);
              return current !== undefined && weeklyPitch(data, memberId) !== undefined && !current.paused;
            }).length;
            const lead = member(data, crew.leadId);
            return (
              <Card key={crew.id} className={isMine ? 'border-stone-500 ring-1 ring-stone-400' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{crew.name}</h2>
                    <p className="text-xs text-stone-500">Lead: {lead?.name ?? '—'}</p>
                  </div>
                  {isMine ? <Tag tone="good">your crew</Tag> : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border border-stone-200 p-2">
                    <div className="text-xs text-stone-500">Streak</div>
                    <div className="font-semibold">{crew.streakWeeks} weeks</div>
                  </div>
                  <div className="rounded border border-stone-200 p-2">
                    <div className="text-xs text-stone-500">Good for pitch</div>
                    <div className="font-semibold">{pitchCount} of {crew.memberIds.length}</div>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {crew.memberIds.map((memberId) => {
                    const current = member(data, memberId);
                    if (!current) return null;
                    return (
                      <li key={memberId} className="border-t border-stone-100 pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{current.name}</span>
                          {current.paused ? <Tag tone="neutral">on pause — carried</Tag> : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {current.capabilities.map((capability) => <Tag key={capability}>{label(capability)}</Tag>)}
                          {current.quals.map((grant) => <Tag key={grant.qual} tone="good">{label(grant.qual)}</Tag>)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs text-stone-500">
                  This streak is held by the crew, so a member having a hard month is carried rather than shamed.
                </p>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Demo control" hint="Use this during a walkthrough to close the current pitch week.">
        <Card>
          <p className="mb-3 text-sm text-stone-600">
            Resolves this week: verified commitments become kept, unresolved past-due ones become no-shows, streaks advance or reset, and the week moves forward.
          </p>
          <AdvanceWeekButton />
        </Card>
      </Section>
    </>
  );
}
