'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ClaimButton({
  taskId,
  label = "I'll take it",
  unclaim = false,
}: {
  taskId: string;
  label?: string;
  unclaim?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError('');
    const response = await fetch(unclaim ? '/api/tasks/unclaim' : '/api/tasks/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? 'Something went wrong.');
    else router.refresh();
    setBusy(false);
  }
  return (
    <div>
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : label}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
