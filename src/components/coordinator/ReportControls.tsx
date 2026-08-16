'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Commitment, Need, Task } from '@/lib/types';

export function VerificationRow({
  commitment,
  taskTitle,
  memberName,
  verifiedByName,
  verifiedAt,
  isViewer,
}: {
  commitment: Commitment;
  taskTitle: string;
  memberName: string;
  verifiedByName?: string;
  verifiedAt?: string;
  isViewer: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const verify = (showed: boolean) => startTransition(async () => {
    const response = await fetch('/api/coordinator/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ commitmentId: commitment.id, showed }),
    });
    if (response.ok) router.refresh();
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="text-xs text-stone-500">{taskTitle}</div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{memberName}</span>
        {commitment.status === 'committed' && isViewer ? (
          <span className="text-xs text-stone-500">you cannot verify your own turnout</span>
        ) : commitment.status === 'committed' ? (
          <div className="flex gap-2">
            <button
              disabled={pending}
              className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
              onClick={() => verify(true)}
            >
              they showed up
            </button>
            <button
              disabled={pending}
              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
              onClick={() => verify(false)}
            >
              they didn&apos;t
            </button>
          </div>
        ) : (
          <span className="text-xs text-stone-600">
            {commitment.status === 'kept' ? 'showed up' : 'no-show'} — recorded by {verifiedByName ?? 'the coordinator'}, {verifiedAt}
          </span>
        )}
      </div>
    </div>
  );
}

export function PublishForm({
  need,
  tasks,
  commitments,
}: {
  need: Need;
  tasks: Task[];
  commitments: Commitment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [whatWorked, setWhatWorked] = useState('');
  const [whatWeWouldChange, setWhatWeWouldChange] = useState('');
  const [wordFromRequester, setWordFromRequester] = useState('');
  const kept = commitments.filter(
    (commitment) => commitment.needId === need.id && commitment.status === 'kept',
  );
  const turnout = new Set(kept.map((commitment) => commitment.memberId)).size;
  const personMinutes = tasks.reduce(
    (sum, task) =>
      sum + task.minutes * kept.filter((commitment) => commitment.taskId === task.id).length,
    0,
  );
  const materiel = [...new Set(tasks.flatMap((task) => task.materiel))].join(', ') || 'none recorded';

  const publish = () => startTransition(async () => {
    const response = await fetch('/api/coordinator/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ needId: need.id, whatWorked, whatWeWouldChange, wordFromRequester }),
    });
    if (response.ok) router.refresh();
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-4 text-sm text-stone-600">
        Prefilled record: {turnout} neighbors, {personMinutes} person-minutes, materiel: {materiel}.
      </div>
      <div className="space-y-3">
        <label className="block text-sm">
          What worked
          <textarea
            className="mt-1 w-full rounded border border-stone-300 p-2"
            value={whatWorked}
            onChange={(event) => setWhatWorked(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          What we would change
          <textarea
            className="mt-1 w-full rounded border border-stone-300 p-2"
            value={whatWeWouldChange}
            onChange={(event) => setWhatWeWouldChange(event.target.value)}
          />
        </label>
        {need.publishConsent ? (
          <label className="block text-sm">
            Optional line from the requester
            <textarea
              className="mt-1 w-full rounded border border-stone-300 p-2"
              value={wordFromRequester}
              onChange={(event) => setWordFromRequester(event.target.value)}
            />
          </label>
        ) : (
          <p className="text-xs text-stone-500">
            The requester did not give consent to publish their name, quote, or a line from them.
          </p>
        )}
        <button
          disabled={pending || !whatWorked || !whatWeWouldChange}
          onClick={publish}
          className="rounded bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-50"
        >
          Publish after-action report
        </button>
      </div>
    </div>
  );
}
