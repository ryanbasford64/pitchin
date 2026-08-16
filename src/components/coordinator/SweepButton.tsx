'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SweepButton({ count }: { count: number }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function sweep() {
    setBusy(true);
    setError('');
    const response = await fetch('/api/coordinator/sweep', { method: 'POST' });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? 'Something went wrong.');
    else router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={sweep}
        disabled={busy || count === 0}
        className="rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {busy ? 'Closing out…' : `Close out ${count} overdue need${count === 1 ? '' : 's'} as unmet`}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
