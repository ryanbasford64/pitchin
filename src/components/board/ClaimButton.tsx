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

export function QuestionForm({ needId }: { needId: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/needs/${needId}/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error ?? 'Could not ask that.');
      return;
    }
    setQuestion('');
    setError('');
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about arrival, access, or supplies" className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm" />
      <button className="rounded-md border border-stone-300 px-3 py-2 text-xs font-medium">Ask</button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </form>
  );
}

export function AnswerForm({ needId, questionId }: { needId: string; questionId: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await fetch(`/api/needs/${needId}/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId, answer }),
    });
    setAnswer('');
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer this question" className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-xs" />
      <button className="rounded-md border border-stone-300 px-2 py-1.5 text-xs">Answer</button>
    </form>
  );
}
