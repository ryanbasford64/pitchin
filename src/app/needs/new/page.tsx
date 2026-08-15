'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewNeedPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [onBehalfOfId, setOnBehalfOfId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [publishConsent, setPublishConsent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/needs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rawText, title, urgency: form.get('urgency'), visibility: form.get('visibility'), onBehalfOfId: onBehalfOfId || undefined, consentGiven, publishConsent }) });
    const result = (await response.json()) as { error?: string; needId?: string };
    if (!response.ok) { setError(result.error ?? 'Could not post the need.'); return; }
    router.push(`/needs/${result.needId}?created=1`);
  }
  return <div className="max-w-2xl"><Link href="/" className="text-xs underline">← Back to the Board</Link><h1 className="mt-4 text-2xl font-semibold">Ask for a hand</h1><p className="mt-1 text-sm text-stone-600">Write the ask in plain English. A coordinator will turn it into tasks; it will not appear on the Board yet.</p><form onSubmit={submit} className="mt-6 space-y-5"><label className="block text-sm font-medium">What is needed?<textarea required value={rawText} onChange={(event) => setRawText(event.target.value)} rows={6} className="mt-2 w-full rounded-md border border-stone-300 p-3 text-sm" placeholder="Tell neighbors what happened and what would help." /></label><label className="block text-sm font-medium">Short title (optional)<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Urgency<select name="urgency" defaultValue="routine" className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"><option>routine</option><option>soon</option><option>urgent</option><option>surge</option></select></label><label className="text-sm font-medium">Visibility<select name="visibility" defaultValue="neighborhood" className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"><option value="neighborhood">Neighborhood</option><option value="crews_only">Crews only</option><option value="private">Private</option></select></label></div><p className="text-xs text-stone-500">Private and crews-only needs never appear on the public Board.</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(onBehalfOfId)} onChange={(event) => setOnBehalfOfId(event.target.checked ? 'mem_doris' : '')} /> I’m posting on behalf of a neighbor</label>{onBehalfOfId ? <><label className="block text-sm font-medium">Neighbor<select value={onBehalfOfId} onChange={(event) => setOnBehalfOfId(event.target.value)} className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"><option value="mem_doris">Doris Kemp</option><option value="mem_paulette">Paulette Nance</option><option value="mem_hansen">Ada Hansen</option></select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consentGiven} onChange={(event) => setConsentGiven(event.target.checked)} required /> I have their consent to post this.</label></> : null}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publishConsent} onChange={(event) => setPublishConsent(event.target.checked)} /> The requester agrees to be named in the after-action report.</label>{error ? <p className="text-sm text-rose-700">{error}</p> : null}<button className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white">Send to a coordinator</button></form></div>;
}
