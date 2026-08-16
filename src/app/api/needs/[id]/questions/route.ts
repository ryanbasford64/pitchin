import { NextResponse } from 'next/server';
import { currentMemberId } from '@/lib/session';
import { dbFresh, id, write } from '@/lib/store';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: needId } = await context.params;
  const body = (await request.json()) as { question?: string; questionId?: string; answer?: string };
  const memberId = await currentMemberId();
  dbFresh();
  const result = write((data) => {
    const need = data.needs.find((item) => item.id === needId);
    if (!need) return { error: 'unknown need', status: 400 as const };
    const taskIds = new Set(data.tasks.filter((task) => task.needId === needId).map((task) => task.id));
    const allowed = need.requesterId === memberId || data.tasks.some(
      (task) => taskIds.has(task.id) && task.claimedBy.includes(memberId),
    );
    if (!allowed) return { error: 'only claimants and the requester can use logistics Q&A', status: 403 as const };
    if (body.questionId) {
      const item = need.questions?.find((question) => question.id === body.questionId);
      if (!item || !body.answer?.trim()) return { error: 'unknown question or empty answer', status: 400 as const };
      if (item.answer) return { error: 'That question already has an answer.', status: 409 as const };
      item.answer = body.answer.trim();
      item.answeredBy = memberId;
      item.answeredAt = new Date().toISOString();
      return { ok: true };
    }
    if (!body.question?.trim()) return { error: 'Question cannot be empty.', status: 400 as const };
    need.questions ??= [];
    need.questions.push({
      id: id('qst'),
      needId,
      askedBy: memberId,
      question: body.question.trim(),
      askedAt: new Date().toISOString(),
      answer: null,
      answeredBy: null,
      answeredAt: null,
    });
    return { ok: true };
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
