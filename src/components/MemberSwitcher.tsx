'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function MemberSwitcher({
  members,
  current,
}: {
  members: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs text-stone-500">
      viewing as
      <select
        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(async () => {
            await fetch('/api/session', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ memberId: id }),
            });
            router.refresh();
          });
        }}
      >
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}
