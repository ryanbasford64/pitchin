'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NeedResolution } from '@/lib/types';

const CHOICES: { value: NeedResolution; label: string; hint: string }[] = [
  { value: 'solved', label: 'Yes — it got handled', hint: 'The thing I needed is done.' },
  { value: 'partly', label: 'Partly', hint: 'Some of it got done; some of it still needs doing.' },
  { value: 'not_solved', label: 'No', hint: 'People came, and I still have the problem.' },
];

export function ResolutionForm({
  needId,
  onBehalfOfRequester,
}: {
  needId: string;
  onBehalfOfRequester: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<NeedResolution | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!choice) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/needs/${needId}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolution: choice, note }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) setError(result.error ?? 'That outcome could not be recorded.');
      else router.refresh();
    } catch {
      setError('That outcome could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium">
        {onBehalfOfRequester
          ? 'Write down what the requester said when you asked.'
          : 'Did this actually solve your problem?'}
      </p>
      <div className="mt-3 space-y-2">
        {CHOICES.map((option) => (
          <label key={option.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="resolution"
              className="mt-1"
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
            />
            <span>
              <span className="font-medium">{option.label}</span>
              <span className="block text-xs text-stone-500">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="mt-3 block text-sm">
        Anything the town should know (optional)
        <textarea
          className="mt-1 w-full rounded border border-stone-300 p-2"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <p className="mt-2 text-xs text-stone-500">
        This is about the outcome, not the people. It never changes anyone&apos;s show-rate.
      </p>
      <button
        type="button"
        onClick={submit}
        disabled={busy || !choice}
        className="mt-3 rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Record the outcome'}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
