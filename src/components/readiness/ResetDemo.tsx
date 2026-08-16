'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ResetDemo() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={busy}
      className="rounded border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
    >
      {busy ? 'Resetting…' : 'Reset demo data'}
    </button>
  );
}
