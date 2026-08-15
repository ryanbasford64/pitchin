'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import type { LogisticsQuestion } from '@/lib/types';

export function LogisticsQA({
  needId,
  questions,
}: {
  needId: string;
  questions: LogisticsQuestion[];
}) {
  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <Card key={question.id}>
          <p className="text-sm">
            <span className="font-medium">Question:</span> {question.question}
          </p>
          {question.answer ? (
            <p className="mt-2 text-sm text-stone-600">
              <span className="font-medium">Answer:</span> {question.answer}
            </p>
          ) : (
            <AnswerForm needId={needId} questionId={question.id} />
          )}
        </Card>
      ))}
      <QuestionForm needId={needId} />
    </div>
  );
}

function QuestionForm({ needId }: { needId: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about arrival, access, or supplies"
        className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
      />
      <button className="rounded-md border border-stone-300 px-3 py-2 text-xs font-medium">
        Ask
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </form>
  );
}

function AnswerForm({
  needId,
  questionId,
}: {
  needId: string;
  questionId: string;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      <input
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Answer this question"
        className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-xs"
      />
      <button className="rounded-md border border-stone-300 px-2 py-1.5 text-xs">
        Answer
      </button>
    </form>
  );
}
