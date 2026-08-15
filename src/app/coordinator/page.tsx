import Link from 'next/link';
import { currentMember } from '@/lib/session';
import {
  capabilityGaps,
  formatRate,
  label,
  memberName,
  readiness,
  showRate,
} from '@/lib/derive';
import type { Database, Member, Need } from '@/lib/types';
import { Card, Empty, Section, Stat, Tag } from '@/components/ui';
import { DecompositionEditor } from '@/components/coordinator/DecompositionEditor';
import { proposeTasks } from './propose';
import { freshData } from './fresh';

export default async function CoordinatorPage() {
  const data = freshData();
  const viewer = await currentMember();
  const queue = intakeQueue(data);
  const snapshot = readiness(data);
  const gaps = capabilityGaps(data);
  const overcalled = overcalledMembers(data);
  const coldCrews = coldCrewsFor(data);
  const singleQuals = singlePointQuals(data);
  const records = recordNeeds(data);

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Coordinator console</h1>
      <p className="mb-6 text-sm text-stone-600">
        A calm place to turn plain asks into work the town can actually staff.
      </p>
      {!viewer.isCoordinator && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You are viewing a coordinator surface without the coordinator role. Everything is
          usable for this demo; approvals and publishing still require a coordinator.
        </div>
      )}

      <Section
        title="Intake queue"
        hint="Private and crews-only asks stay here, never on the public Board."
      >
        {queue.length === 0 ? (
          <Empty>Nothing is waiting for a human read.</Empty>
        ) : (
          <div className="space-y-3">
            {queue.map((need) => (
              <Card key={need.id}>
                <blockquote className="border-l-2 border-stone-300 pl-3 text-sm text-stone-700">
                  “{need.rawText}”
                </blockquote>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span>
                    {need.publishConsent
                      ? memberName(data, need.requesterId)
                      : `a neighbor in ${need.neighborhood}`}
                  </span>
                  <span>·</span>
                  <span>{need.street}</span>
                  <Tag tone={need.urgency === 'urgent' ? 'alert' : 'neutral'}>
                    {need.urgency}
                  </Tag>
                </div>
                <DecompositionEditor need={need} initial={proposeTasks(need)} />
                <Link
                  className="mt-3 inline-block text-xs text-stone-700 underline"
                  href={`/reports/${need.id}`}
                >
                  view record / verification →
                </Link>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Records"
        hint="Published work and needs that are ready for verification or review."
      >
        {records.length === 0 ? (
          <Empty>No after-action records or completed needs yet.</Empty>
        ) : (
          <div className="space-y-2">
            {records.map((need) => (
              <Link
                key={need.id}
                href={`/reports/${need.id}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-400"
              >
                <div className="font-medium">{need.title}</div>
                <div className="mt-1 text-xs text-stone-500">
                  {data.reports.some((report) => report.needId === need.id)
                    ? 'published after-action report'
                    : 'awaiting verification or record review'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Capability gap report"
        hint="The artifact a county can use to see where readiness is thin."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="text-sm font-medium">Open work with no available capability</div>
            {gaps.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {gaps.map((gap) => (
                  <li key={gap.task.id}>
                    Nobody in the registry can field <strong>{gap.missing.join(' or ')}</strong>{' '}
                    for “{gap.task.title}”.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-stone-500">
                Every open task has a possible capability match.
              </p>
            )}
          </Card>
          <Card>
            <div className="text-sm font-medium">Town readiness gaps</div>
            {snapshot.gaps.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {snapshot.gaps.map((gap) => <li key={gap}>{gap}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No readiness gaps are showing.</p>
            )}
          </Card>
        </div>
      </Section>

      <Section title="Roster health">
        <div className="grid gap-3 sm:grid-cols-2">
          <RosterCard title="Most commitments this week">
            {overcalled.length ? (
              <ul className="mt-2 text-sm">
                {overcalled.slice(0, 5).map(({ member, count }) => (
                  <li key={member.id}>{member.name} — {count} active commitments</li>
                ))}
              </ul>
            ) : (
              <Empty>No one is carrying multiple commitments this week.</Empty>
            )}
          </RosterCard>
          <RosterCard title="Paused members">
            {data.members.some((member) => member.paused) ? (
              <ul className="mt-2 text-sm">
                {data.members.filter((member) => member.paused).map((member) => (
                  <li key={member.id}>{member.name}</li>
                ))}
              </ul>
            ) : (
              <Empty>No members are paused.</Empty>
            )}
          </RosterCard>
          <RosterCard title="Single points of failure">
            {singleQuals.length ? (
              <ul className="mt-2 text-sm">
                {singleQuals.map(({ qual, member }) => (
                  <li key={qual}>{label(qual)} — only {member.name}</li>
                ))}
              </ul>
            ) : (
              <Empty>No qualification is held by only one person.</Empty>
            )}
          </RosterCard>
          <RosterCard title="Crews going cold">
            {coldCrews.length ? (
              <ul className="mt-2 text-sm">
                {coldCrews.map((crew) => <li key={crew.id}>{crew.name}</li>)}
              </ul>
            ) : (
              <Empty>Every crew has a kept commitment in the last 30 days.</Empty>
            )}
          </RosterCard>
        </div>
      </Section>

      <Section
        title="Rotation fairness"
        hint="A workload warning, not a leaderboard: do not burn out your most reliable people."
      >
        {overcalled.length ? (
          <div className="space-y-2">
            {overcalled.map(({ member, count }) => (
              <Card key={member.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {member.name} is about to be called a third time this week
                  </div>
                  <div className="text-xs text-stone-500">
                    They already hold {count} non-declined commitments inside the pitch week.
                    Do not burn out your most reliable people.
                  </div>
                </div>
                <Tag tone="warn">{formatRate(showRate(member).rate)} show-rate</Tag>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>No one is at the two-commitment cap this week.</Empty>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open work" value={String(data.tasks.filter((task) => task.status === 'open').length)} />
        <Stat label="Ready members" value={String(snapshot.membersReadyThisWeek)} />
        <Stat label="Needs open" value={String(snapshot.needsOpen)} />
        <Stat label="Week of" value={data.weekOf} />
      </div>
    </>
  );
}

function intakeQueue(data: Database): Need[] {
  return data.needs.filter((need, index, all) =>
    all.findIndex((item) => item.id === need.id) === index &&
    (need.status === 'draft' ||
      need.taskIds.length === 0 ||
      ((need.visibility === 'private' || need.visibility === 'crews_only') &&
        need.status !== 'done' &&
        need.status !== 'cancelled')),
  );
}

function overcalledMembers(data: Database): { member: Member; count: number }[] {
  const weekStart = new Date(`${data.weekOf}T00:00:00.000Z`).getTime();
  const weekEnd = weekStart + 7 * 864e5;
  return data.members
    .map((member) => ({
      member,
      count: data.commitments.filter((commitment) => {
        if (commitment.memberId !== member.id || commitment.status === 'declined') return false;
        const task = data.tasks.find((item) => item.id === commitment.taskId);
        if (!task) return false;
        const scheduled = new Date(task.scheduledFor).getTime();
        return scheduled >= weekStart && scheduled < weekEnd;
      }).length,
    }))
    .filter((item) => item.count >= 2);
}

function coldCrewsFor(data: Database) {
  const recentCutoff = new Date(`${data.weekOf}T00:00:00.000Z`).getTime() - 30 * 864e5;
  return data.crews.filter((crew) => !data.commitments.some((commitment) => {
    if (!crew.memberIds.includes(commitment.memberId) || commitment.status !== 'kept') return false;
    const task = data.tasks.find((item) => item.id === commitment.taskId);
    return task !== undefined && new Date(task.scheduledFor).getTime() >= recentCutoff;
  }));
}

function singlePointQuals(data: Database) {
  return data.members
    .flatMap((member) => member.quals.map((grant) => ({ qual: grant.qual, member })))
    .filter((item) =>
      data.members.filter((member) => member.quals.some((grant) => grant.qual === item.qual)).length === 1,
    );
}

function recordNeeds(data: Database): Need[] {
  return data.needs.filter((need, index, all) => {
    if (all.findIndex((item) => item.id === need.id) !== index) return false;
    const tasks = data.tasks.filter((task) => task.needId === need.id);
    const hasReport = data.reports.some((report) => report.needId === need.id);
    const readyForReview = tasks.some((task) => task.status === 'done') ||
      data.commitments.some((commitment) => commitment.needId === need.id && commitment.status === 'committed');
    return hasReport || readyForReview;
  });
}

function RosterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="font-medium">{title}</div>
      {children}
    </Card>
  );
}
