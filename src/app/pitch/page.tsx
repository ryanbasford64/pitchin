import { Card, Empty, Section, Stat, Tag } from '@/components/ui';
import {
  askMinutes,
  formatRate,
  formatWhen,
  label,
  member,
  need,
  showRate,
  task,
  weeklyPitch,
} from '@/lib/derive';
import { currentMember } from '@/lib/session';
import { db } from '@/lib/store';
import { declinedThisWeek, partnersFor, pitchCandidate, startsInFuture } from '@/app/api/pitch/logic';
import { CancelPitchButton, PauseToggle, PitchOfferActions } from '@/components/pitch/PitchActions';

export default async function PitchPage() {
  const data = db();
  const current = await currentMember();
  const held = weeklyPitch(data, current.id);
  const candidate = current.paused ? null : pitchCandidate(data, current.id);
  const declined = declinedThisWeek(data, current.id);
  const rate = showRate(current);
  const heldTask = held ? task(data, held.taskId) : undefined;
  const heldNeed = heldTask ? need(data, heldTask.needId) : undefined;
  const candidateNeed = candidate ? need(data, candidate.needId) : undefined;
  const heldPartners = heldTask ? partnersFor(data, heldTask, current.id) : [];
  const candidatePartners = candidate ? partnersFor(data, candidate, current.id) : [];
  const firstClaimantLine = "You're first on this one — nobody else has claimed it yet.";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My weekly pitch</h1>
          <p className="mt-1 text-sm text-stone-600">
            One small, well-matched promise at a time. Week of {data.weekOf}.
          </p>
        </div>
        <PauseToggle paused={current.paused} />
      </div>

      <Section title="Your standing" hint="Show-rate is kept commitments over made commitments, never hours.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Show-rate" value={formatRate(rate.rate)} />
          <Stat label="Kept / made" value={`${rate.kept} / ${rate.made}`} />
          <Stat label="Current ask" value={`${askMinutes(current)} min`} />
          <Stat label="No-shows" value={String(current.noShows)} hint="Only unannounced misses count." />
        </div>
      </Section>

      {current.paused ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <h2 className="font-semibold">You are on pause</h2>
          <p className="mt-1 text-sm text-emerald-900">
            No pitch will be offered while you are out. There is no cost to your standing; your crew&apos;s
            streak is not affected while you are away.
          </p>
        </Card>
      ) : held && heldTask && heldNeed ? (
        <Section title="Your standing order" hint="Sustainment is a drill for surge: a small promise keeps the town ready.">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{heldTask.title}</h2>
                <p className="mt-1 text-sm text-stone-600">{formatWhen(heldTask.scheduledFor)}</p>
                <p className="text-sm text-stone-600">
                  {heldNeed.street} · {heldNeed.neighborhood}
                </p>
              </div>
              {held.status === 'kept' ? <Tag tone="good">kept</Tag> : held.status === 'no_show' ? <Tag tone="alert">no-show</Tag> : <Tag>committed</Tag>}
            </div>
            <p className="mt-3 text-sm">
              {heldPartners.length > 0 ? `You're paired with ${heldPartners.join(', ')}.` : firstClaimantLine}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Bring {heldTask.materiel.length > 0 ? heldTask.materiel.join(', ') : 'your usual readiness kit'}.
            </p>
            {held.status === 'committed' && startsInFuture(heldTask) ? (
              <div className="mt-4">
                <p className="mb-2 text-xs text-stone-500">Cancelling before the start is free and does not count against you.</p>
                <CancelPitchButton commitmentId={held.id} />
              </div>
            ) : held.status === 'committed' ? (
              <p className="mt-3 text-xs text-stone-500">The requester closes this out from here once the task has started.</p>
            ) : null}
          </Card>
        </Section>
      ) : (
        <Section title="This week&apos;s offer" hint="Pre-scoped to one task that fits what you can do and when you are available.">
          {candidate && candidateNeed ? (
            <Card>
              {declined.length > 0 ? (
                <p className="mb-3 text-sm text-stone-600">
                  You passed on an earlier fit this week. Passing is free — it costs nothing and is not a mark against you.
                </p>
              ) : null}
              <h2 className="text-lg font-semibold">{candidate.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{formatWhen(candidate.scheduledFor)}</p>
              <p className="text-sm text-stone-600">
                {candidateNeed.street} · {candidateNeed.neighborhood}
              </p>
              {candidateNeed.publishConsent ? (
                <p className="mt-2 text-sm text-stone-600">
                  Requested by {member(data, candidateNeed.requesterId)?.name ?? 'a neighbor'}.
                </p>
              ) : null}
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  {candidatePartners.length > 0
                    ? `You'd be paired with ${candidatePartners.join(', ')}.`
                    : firstClaimantLine}
                </p>
                <p>
                  Bring {candidate.materiel.length > 0 ? candidate.materiel.join(', ') : 'what you already have'}.
                  {candidate.capabilities.length > 0 ? ` This task calls for ${candidate.capabilities.map(label).join(', ')}.` : ''}
                </p>
                <p>
                  The ask is {askMinutes(current)} minutes. {askMinutes(current) < 20 ? "We're keeping it short this week." : ''}
                </p>
              </div>
              <p className="mt-4 text-xs text-stone-500">
                Declining is free and costs nothing — passing is not a mark against you.
              </p>
              <div className="mt-4">
                <PitchOfferActions taskId={candidate.id} />
              </div>
            </Card>
          ) : (
            <Empty>
              {declined.length > 0
                ? 'You passed on an earlier fit this week. Passing is free and is not a mark against you. Nothing else fits your capabilities and availability window right now.'
                : 'Nothing fits your capabilities and availability window this week. That is fine — passing is part of a sustainable cadence.'}
            </Empty>
          )}
        </Section>
      )}
    </>
  );
}
