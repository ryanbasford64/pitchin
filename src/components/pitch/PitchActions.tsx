'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

async function post(path: string, body: Record<string, boolean | string>) {
  await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function PitchOfferActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (path: string) => {
    startTransition(async () => {
      await post(path, { taskId });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run('/api/pitch/commit')}
        className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : "I'm good for it"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run('/api/pitch/decline')}
        className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
      >
        Not this week
      </button>
    </div>
  );
}

export function CancelPitchButton({ commitmentId }: { commitmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await post('/api/pitch/cancel', { commitmentId });
          router.refresh();
        });
      }}
      className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
    >
      {pending ? 'Saving…' : "I can't make it after all"}
    </button>
  );
}

export function PauseToggle({ paused }: { paused: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await post('/api/pitch/pause', { paused: !paused });
          router.refresh();
        });
      }}
      className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-50"
    >
      {pending ? 'Saving…' : paused ? 'Resume my pitch' : 'Pause my pitch'}
    </button>
  );
}

interface AdvanceSummary {
  kept: number;
  noShows: number;
  crews: { name: string; outcome: 'broken' | 'kept' | 'quiet'; streakWeeks: number }[];
  weekOf: string;
}

export function AdvanceWeekButton() {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<AdvanceSummary | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch('/api/pitch/advance-week', { method: 'POST' });
            if (!response.ok) return;
            const next = (await response.json()) as AdvanceSummary;
            setSummary(next);
            router.refresh();
          });
        }}
        className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Resolving…' : 'Advance the week'}
      </button>
      {summary ? (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          <div>
            {summary.kept} kept, {summary.noShows} no-show{summary.noShows === 1 ? '' : 's'} · now week of{' '}
            {summary.weekOf}
          </div>
          <ul className="mt-1 text-xs">
            {summary.crews.map((crew) => (
              <li key={crew.name}>
                {crew.name}: {crew.outcome}, {crew.streakWeeks} week{crew.streakWeeks === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
