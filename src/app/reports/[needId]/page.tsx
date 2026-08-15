import Link from 'next/link';
import { currentMember } from '@/lib/session';
import { formatWhen, memberName, tasksForNeed } from '@/lib/derive';
import { Card, Empty, Section, Tag } from '@/components/ui';
import { VerificationRow, PublishForm } from '@/components/coordinator/ReportControls';
import { freshData } from '@/app/coordinator/fresh';

export default async function ReportPage({ params }: { params: Promise<{ needId: string }> }) {
  const { needId } = await params;
  const data = freshData();
  const viewer = await currentMember();
  const need = data.needs.find((item) => item.id === needId);

  if (!need) return <Empty>That need is not in the record.</Empty>;

  const tasks = tasksForNeed(data, need.id);
  const report = data.reports.find((item) => item.needId === need.id);
  const canVerify = viewer.id === need.requesterId || viewer.isCoordinator;
  const allDone = tasks.length > 0 && tasks.every((task) => task.status === 'done');
  const verificationRows = tasks.flatMap((task) =>
    data.commitments
      .filter((commitment) => commitment.taskId === task.id && commitment.status !== 'declined')
      .map((commitment) => ({
        commitment,
        taskTitle: task.title,
        memberName: memberName(data, commitment.memberId),
        verifiedByName: commitment.verifiedBy
          ? memberName(data, commitment.verifiedBy)
          : undefined,
        verifiedAt: commitment.verifiedAt ? formatWhen(commitment.verifiedAt) : 'date unavailable',
      })),
  );

  return (
    <>
      <Link href="/coordinator" className="text-xs text-stone-600 underline">
        ← coordinator console
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{need.title}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {formatWhen(need.createdAt)} · needed by{' '}
        {need.neededBy ? formatWhen(need.neededBy) : 'when possible'} · {need.street}
      </p>

      <Card className="mt-5">
        {need.publishConsent ? (
          <>
            <p className="text-sm font-medium">{memberName(data, need.requesterId)}</p>
            <blockquote className="mt-2 border-l-2 border-stone-300 pl-3 text-sm text-stone-700">
              “{need.rawText}”
            </blockquote>
          </>
        ) : (
          <p className="text-sm">Requested by a neighbor in {need.neighborhood}.</p>
        )}
      </Card>

      <Section
        title="Requester verification"
        hint="Verification comes from the requester, never the helper."
      >
        {!canVerify ? (
          <p className="text-sm text-stone-500">
            Only the requester or a coordinator can verify turnout.
          </p>
        ) : verificationRows.length === 0 ? (
          <Empty>No commitments are waiting for verification.</Empty>
        ) : (
          <div className="space-y-3">
            {verificationRows.map((row) => (
              <VerificationRow
                key={row.commitment.id}
                commitment={row.commitment}
                taskTitle={row.taskTitle}
                memberName={row.memberName}
                verifiedByName={row.verifiedByName}
                verifiedAt={row.verifiedAt}
                isViewer={row.commitment.memberId === viewer.id}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="After-action report">
        {report ? (
          <Card>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-stone-500">Turnout</div>
                <div className="font-medium">
                  {report.turnout.map((id) => memberName(data, id)).join(', ')}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Person-minutes</div>
                <div className="font-medium">{report.personMinutes}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Published</div>
                <div className="font-medium">{formatWhen(report.publishedAt)}</div>
              </div>
            </div>
            <p className="mt-4 text-sm">
              <strong>What was needed:</strong> {report.whatWasNeeded}
            </p>
            <p className="mt-2 text-sm">
              <strong>Materiel used:</strong> {report.materielUsed.join(', ') || 'none recorded'}
            </p>
            <p className="mt-2 text-sm">
              <strong>What worked:</strong> {report.whatWorked}
            </p>
            <p className="mt-2 text-sm">
              <strong>What we would change:</strong> {report.whatWeWouldChange}
            </p>
            {report.wordFromRequester && (
              <p className="mt-3 border-l-2 border-stone-300 pl-3 text-sm italic">
                “{report.wordFromRequester}”
              </p>
            )}
          </Card>
        ) : allDone && viewer.isCoordinator ? (
          <PublishForm need={need} tasks={tasks} commitments={data.commitments} />
        ) : allDone ? (
          <p className="text-sm text-stone-500">
            All tasks are resolved. A coordinator can publish the record.
          </p>
        ) : (
          <Card>
            <Tag tone="warn">Still outstanding</Tag>
            <p className="mt-2 text-sm">
              This need is not complete yet.{' '}
              {tasks.filter((task) => task.status !== 'done').map((task) => task.title).join('; ') ||
                'Some verification remains.'}
            </p>
          </Card>
        )}
      </Section>
    </>
  );
}
