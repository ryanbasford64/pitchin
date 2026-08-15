'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CAPABILITIES, ALL_QUALS, label } from '@/lib/derive';
import type { Need } from '@/lib/types';
import type { TaskDraft } from '@/app/coordinator/propose';

export function DecompositionEditor({ need, initial }: { need: Need; initial: TaskDraft[] }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const update = (index: number, patch: Partial<TaskDraft>) =>
    setDrafts((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const approve = () => startTransition(async () => {
    const response = await fetch('/api/coordinator/approve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ needId: need.id, tasks: drafts }),
    });
    if (response.ok) router.refresh();
  });
  if (!open) {
    return (
      <button
        className="mt-4 rounded border border-stone-300 px-3 py-1 text-xs"
        onClick={() => setOpen(true)}
      >
        decompose
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div><div className="font-medium">Decomposition editor</div><div className="text-xs text-amber-700">proposed — nothing is live until you approve</div></div>
        <button className="rounded bg-stone-900 px-3 py-2 text-xs text-white disabled:opacity-50" disabled={pending || drafts.length === 0} onClick={approve}>Approve and open this need</button>
      </div>
      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <div key={`${index}-${draft.title}`} className="rounded border border-stone-200 bg-stone-50 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_80px_80px_190px_auto]">
              <input className="rounded border border-stone-300 bg-white px-2 py-1 text-sm" value={draft.title} onChange={(e) => update(index, { title: e.target.value })} />
              <input aria-label="minutes" className="rounded border border-stone-300 bg-white px-2 py-1 text-sm" type="number" min="1" value={draft.minutes} onChange={(e) => update(index, { minutes: Number(e.target.value) })} />
              <input aria-label="quorum" className="rounded border border-stone-300 bg-white px-2 py-1 text-sm" type="number" min="1" value={draft.quorum} onChange={(e) => update(index, { quorum: Number(e.target.value) })} />
              <input aria-label="scheduled time" className="rounded border border-stone-300 bg-white px-2 py-1 text-sm" type="datetime-local" value={draft.scheduledFor.slice(0, 16)} onChange={(e) => update(index, { scheduledFor: new Date(e.target.value).toISOString() })} />
              <button className="text-xs text-rose-700" onClick={() => setDrafts((items) => items.filter((_, i) => i !== index))}>remove</button>
            </div>
            <input className="mt-2 w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs" placeholder="Materiel, comma separated" value={draft.materiel.join(', ')} onChange={(e) => update(index, { materiel: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {ALL_CAPABILITIES.map((cap) => <Toggle key={cap} active={draft.capabilities.includes(cap)} text={label(cap)} onClick={() => update(index, { capabilities: toggle(draft.capabilities, cap) })} />)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {ALL_QUALS.map((qual) => <Toggle key={qual} active={draft.quals.includes(qual)} text={`qual: ${label(qual)}`} onClick={() => update(index, { quals: toggle(draft.quals, qual) })} />)}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 rounded border border-stone-300 px-3 py-1 text-xs" onClick={() => setDrafts((items) => [...items, { title: '', minutes: 30, quorum: 1, capabilities: [], quals: [], materiel: [], scheduledFor: new Date().toISOString() }])}>+ add blank task</button>
    </div>
  );
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Toggle({ active, text, onClick }: { active: boolean; text: string; onClick: () => void }) {
  return <button type="button" className={`rounded px-1.5 py-0.5 ${active ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-300'}`} onClick={onClick}>{text}</button>;
}
