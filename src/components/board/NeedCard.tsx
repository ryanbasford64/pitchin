import Link from 'next/link';
import { Card, Tag } from '@/components/ui';
import { ClaimButton } from '@/components/board/ClaimButton';
import { approximateStreet, shortText, taskForMember } from '@/components/board/helpers';
import { formatWhen, stillNeeded, tasksForNeed } from '@/lib/derive';
import type { Database, Member, Need } from '@/lib/types';

export function NeedCard({
  data,
  need,
  memberId,
  current,
}: {
  data: Database;
  need: Need;
  memberId: string;
  current: Member | undefined;
}) {
  const tasks = tasksForNeed(data, need.id);
  const openTasks = tasks.filter((task) => task.status === 'open');
  const still = openTasks.reduce((sum, task) => sum + stillNeeded(task), 0);
  const claimTask = taskForMember(data, need, memberId);
  const claimed = tasks.some((task) => task.claimedBy.includes(memberId));
  const matches = [
    ...new Set(
      tasks
        .flatMap((task) => task.capabilities)
        .filter((capability) => current?.capabilities.includes(capability)),
    ),
  ];
  const shortestQuorum = openTasks
    .filter((task) => stillNeeded(task) > 0)
    .sort((a, b) => a.quorum - b.quorum)[0]?.quorum;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{need.title}</h3>
            <Tag
              tone={
                need.urgency === 'surge' || need.urgency === 'urgent'
                  ? 'alert'
                  : need.urgency === 'soon'
                    ? 'warn'
                    : 'neutral'
              }
            >
              {need.urgency}
            </Tag>
          </div>
          <p className="mt-1 text-sm text-stone-600">{shortText(need.rawText)}</p>
          <p className="mt-2 text-xs text-stone-500">
            {formatWhen(tasks[0]?.scheduledFor ?? need.createdAt)} · {approximateStreet(need.street)}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            {tasks.map((task) => task.title).join(' · ')}
          </p>
          <p className="mt-1 text-sm font-medium">
            {still
              ? `needs ${still} more${shortestQuorum && shortestQuorum > 1 ? ` — this one doesn’t run until ${shortestQuorum} people commit` : ''}`
              : 'fully staffed'}
          </p>
          {matches.length ? (
            <p className="mt-1 text-xs text-stone-500">
              Matches what you have: {matches.join(', ')}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2">
          {claimTask ? (
            <ClaimButton taskId={claimTask.id} />
          ) : claimed ? (
            <span className="text-xs text-stone-600">You’re on this one</span>
          ) : (
            <span className="text-xs text-stone-500">No open task fits right now</span>
          )}
          <Link href={`/needs/${need.id}`} className="text-xs underline">
            See the tasks
          </Link>
        </div>
      </div>
    </Card>
  );
}
