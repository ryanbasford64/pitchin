import { Card, Tag } from '@/components/ui';
import { formatWhen, member } from '@/lib/derive';
import type { Commitment, Database, Need, Task } from '@/lib/types';

export function PitchCard({
  data,
  memberId,
  need,
  task,
  status,
}: {
  data: Database;
  memberId: string;
  need: Need;
  task: Task;
  status: Commitment['status'];
}) {
  const partners = task.claimedBy
    .filter((id) => id !== memberId)
    .map((id) => member(data, id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{task.title}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {formatWhen(task.scheduledFor)} · {need.street}
          </p>
          <p className="mt-2 text-sm">
            Paired with {partners || 'the rest of your crew'}.
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Bring: {task.materiel.length ? task.materiel.join(', ') : 'nothing to bring'}.
          </p>
        </div>
        {status === 'kept' ? (
          <Tag tone="good">kept</Tag>
        ) : status === 'no_show' ? (
          <Tag tone="alert">no-show</Tag>
        ) : (
          <Tag>committed</Tag>
        )}
      </div>
    </Card>
  );
}
