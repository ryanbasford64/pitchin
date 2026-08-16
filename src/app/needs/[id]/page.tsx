import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClaimButton } from '@/components/board/ClaimButton';
import { LogisticsQA } from '@/components/board/LogisticsQA';
import { approximateStreet } from '@/components/board/helpers';
import { Card, Empty, Section, Tag } from '@/components/ui';
import { formatWhen, member, stillNeeded, tasksForNeed } from '@/lib/derive';
import { currentMemberId } from '@/lib/session';
import { dbFresh } from '@/lib/store';

export default async function NeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const data = dbFresh();
  const need = data.needs.find((item) => item.id === id);

  if (!need) notFound();

  const memberId = await currentMemberId();
  const tasks = tasksForNeed(data, need.id);
  const claimant = tasks.some((item) => item.claimedBy.includes(memberId));
  const requester = need.requesterId === memberId;

  const viewer = member(data, memberId);
  const inACrew = viewer?.crewId != null;

  if (need.visibility === 'private' && !claimant && !requester) notFound();
  if (need.visibility === 'crews_only' && !inACrew && !requester) notFound();

  const exactAddress = claimant || requester;
  const requesterName = need.publishConsent
    ? member(data, need.requesterId)?.name
    : 'a neighbor';
  const canAsk = claimant || requester;
  const now = +new Date();

  return (
    <div className="max-w-3xl">
      <Link href="/" className="text-xs underline">
        ← Back to the Board
      </Link>

      {query.created ? (
        <Card className="mt-4 border-emerald-200 bg-emerald-50">
          <p className="text-sm">
            Thanks — a coordinator will decompose this ask into tasks. It is
            not on the Board yet.
          </p>
        </Card>
      ) : null}

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Tag
            tone={
              need.urgency === 'urgent' || need.urgency === 'surge'
                ? 'alert'
                : 'neutral'
            }
          >
            {need.urgency}
          </Tag>
          <h1 className="mt-2 text-2xl font-semibold">{need.title}</h1>
          <p className="mt-2 text-sm text-stone-600">
            Asked by {requesterName}
          </p>
        </div>
        <span className="text-xs text-stone-500">{need.status}</span>
      </div>

      <Card className="mt-6">
        <p className="whitespace-pre-wrap text-sm leading-6">{need.rawText}</p>
        <p className="mt-4 text-xs text-stone-500">
          Address: {exactAddress ? need.street : approximateStreet(need.street)}
        </p>
      </Card>

      <Section
        title="Tasks"
        hint="A task launches only when its minimum headcount commits."
      >
        {tasks.length === 0 ? (
          <Empty>A coordinator is decomposing this ask into tasks.</Empty>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const mine = task.claimedBy.includes(memberId);
              const future = new Date(task.scheduledFor).getTime() > now;

              return (
                <Card key={task.id}>
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="mt-1 text-xs text-stone-500">
                        {task.minutes} minutes · {formatWhen(task.scheduledFor)} ·
                        quorum {task.quorum}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Capabilities: {task.capabilities.join(', ') || 'none'} ·
                        Qualifications: {task.quals.join(', ') || 'none'}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Bring: {task.materiel.length ? task.materiel.join(', ') : 'nothing'}
                      </p>
                      <p className="mt-2 text-sm">
                        {task.claimedBy.length
                          ? `Claimed by ${task.claimedBy
                              .map((id) => member(data, id)?.name ?? 'a neighbor')
                              .join(', ')}`
                          : 'No one has claimed this yet.'}
                      </p>
                      {stillNeeded(task) ? (
                        <p className="mt-1 text-xs font-medium text-amber-800">
                          {task.quorum > 1
                            ? `Needs ${stillNeeded(task)} more — this one doesn’t run until ${task.quorum} people commit.`
                            : 'Needs one person — nobody has this yet.'}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-medium text-emerald-700">
                          Staffed for launch.
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {mine && future ? (
                        <ClaimButton
                          taskId={task.id}
                          unclaim
                          label="Can’t make it (free to decline)"
                        />
                      ) : !mine && task.status === 'open' ? (
                        <ClaimButton taskId={task.id} />
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {canAsk ? (
        <Section
          title="Logistics Q&A"
          hint="Keep practical details with the people making this happen."
        >
          <LogisticsQA needId={need.id} questions={need.questions ?? []} />
        </Section>
      ) : null}
    </div>
  );
}
