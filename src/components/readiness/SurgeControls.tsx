'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Qual } from '@/lib/types';
import { label } from '@/lib/derive';

async function postSurge(body: unknown) {
  const response = await fetch('/api/surge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
      ? result.error
      : 'The surge action could not be completed.';
    throw new Error(message);
  }
}

export function DeclareSurgeForm({ quals }: { quals: Qual[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await postSurge({ action: 'declare', name: form.get('name'), quals: form.getAll('quals') });
      formElement.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The surge action could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
      <label className="block text-sm font-medium">
        Surge name
        <input name="name" required className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-sm" placeholder="Cold snap response" />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">Required quals</legend>
        <p className="mt-1 text-xs text-stone-500">Quals decide who is asked at all; only qualified members enter the roll call.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {quals.map((qual) => (
            <label key={qual} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="quals" value={qual} />
              {label(qual)}
            </label>
          ))}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50">
        {busy ? 'Declaring…' : 'Declare surge'}
      </button>
    </form>
  );
}

export function SurgeResponseButtons({
  surgeId,
  memberId,
  response,
}: {
  surgeId: string;
  memberId: string;
  response: 'yes' | 'no' | 'pending';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function respond(next: 'yes' | 'no') {
    setBusy(true);
    setFailure(null);
    try {
      await postSurge({ action: 'respond', surgeId, memberId, response: next });
      router.refresh();
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : 'That answer could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      <button type="button" disabled={busy} onClick={() => respond('yes')} className={`rounded border px-2 py-1 text-xs ${response === 'yes' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-stone-300'}`}>Yes</button>
      <button type="button" disabled={busy} onClick={() => respond('no')} className={`rounded border px-2 py-1 text-xs ${response === 'no' ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-stone-300'}`}>No</button>
      {failure ? <span className="text-xs text-rose-700">{failure}</span> : null}
    </span>
  );
}

export function StandDownButton({ surgeId }: { surgeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  async function standDown() {
    setBusy(true);
    setFailure(null);
    try {
      await postSurge({ action: 'stand_down', surgeId });
      router.refresh();
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : 'The surge could not be stood down.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={standDown} disabled={busy} className="rounded border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-50">
        {busy ? 'Standing down…' : 'Stand down surge'}
      </button>
      {failure ? <span className="text-xs text-rose-700">{failure}</span> : null}
    </span>
  );
}
