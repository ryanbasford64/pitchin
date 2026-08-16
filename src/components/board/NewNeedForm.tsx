'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { NeedUrgency, NeedVisibility } from '@/lib/types';

type MemberOption = { id: string; name: string };

export function NewNeedForm({ members }: { members: MemberOption[] }) {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [urgency, setUrgency] = useState<NeedUrgency>('routine');
  const [visibility, setVisibility] = useState<NeedVisibility>('neighborhood');
  const [postingOnBehalf, setPostingOnBehalf] = useState(false);
  const [onBehalfOfId, setOnBehalfOfId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [publishConsent, setPublishConsent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch('/api/needs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rawText,
        title,
        urgency,
        visibility,
        onBehalfOfId: postingOnBehalf ? onBehalfOfId : undefined,
        consentGiven,
        publishConsent,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      needId?: string;
    };

    if (!response.ok) {
      setError(result.error ?? 'Could not post the need.');
      return;
    }

    router.push(`/needs/${result.needId}?created=1`);
  }

  function togglePostingOnBehalf() {
    setPostingOnBehalf((value) => !value);
    setOnBehalfOfId('');
    setConsentGiven(false);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm font-medium">
        What is needed?
        <textarea
          required
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          rows={6}
          className="mt-2 w-full rounded-md border border-stone-300 p-3 text-sm"
          placeholder="Tell neighbors what happened and what would help."
        />
      </label>

      <label className="block text-sm font-medium">
        Short title (optional)
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Urgency
          <select
            value={urgency}
            onChange={(event) => setUrgency(event.target.value as NeedUrgency)}
            className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"
          >
            <option value="routine">routine</option>
            <option value="soon">soon</option>
            <option value="urgent">urgent</option>
            <option value="surge">surge</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Visibility
          <select
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value as NeedVisibility)
            }
            className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"
          >
            <option value="neighborhood">Neighborhood</option>
            <option value="crews_only">Crews only</option>
            <option value="private">Private</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-stone-500">
        Private and crews-only needs never appear on the public Board.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={postingOnBehalf}
          onChange={togglePostingOnBehalf}
        />
        I’m posting on behalf of a neighbor
      </label>

      {postingOnBehalf ? (
        <>
          <label className="block text-sm font-medium">
            Neighbor
            <select
              required
              value={onBehalfOfId}
              onChange={(event) => setOnBehalfOfId(event.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 p-2 text-sm"
            >
              <option value="">Choose a neighbor</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(event) => setConsentGiven(event.target.checked)}
              required
            />
            I have their consent to post this.
          </label>
        </>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publishConsent}
          onChange={(event) => setPublishConsent(event.target.checked)}
        />
        The requester agrees to be named in the after-action report.
      </label>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white">
        Send to a coordinator
      </button>
    </form>
  );
}
