import { formatRate, formatWhen, label, showRate, tasksForNeed } from '@/lib/derive';
import { db } from '@/lib/store';
import { PrintButton } from '@/components/readiness/PrintButton';

export default function PrintPage() {
  const data = db();
  const needs = data.needs.filter((need) => (need.status === 'open' || need.status === 'staffed') && need.visibility === 'neighborhood');
  const coordinator = data.members.find((member) => member.isCoordinator);
  const referenceTime = new Date(`${data.weekOf}T00:00:00.000Z`).getTime();
  const metThisMonth = data.needs.filter((need) => need.status === 'done' && new Date(need.createdAt).getTime() >= referenceTime - 30 * 864e5).length;
  const upcoming = needs
    .flatMap((need) => tasksForNeed(data, need.id).map((task) => ({ need, task })))
    .filter(({ task }) => new Date(task.scheduledFor).getTime() >= referenceTime)
    .sort((a, b) => a.task.scheduledFor.localeCompare(b.task.scheduledFor))[0];

  return (
    <>
      <style>{`
        header, body > footer { display: none !important; }
        main { max-width: none !important; padding: 1rem 1.5rem !important; }
        .print-board { max-width: 1080px; margin: 0 auto; }
        @media print {
          @page { margin: 0.55in; }
          html, body { background: white !important; color: black !important; }
          header, body > footer, .print-hide { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .print-board { max-width: none; }
          .print-card { border: 1px solid #111 !important; box-shadow: none !important; break-inside: avoid; }
          a { color: black !important; text-decoration: none !important; }
          h1, h2, h3, p, div, span { color: black !important; }
        }
      `}</style>
      <div className="print-board text-stone-900">
        <div className="mb-8 flex items-start justify-between gap-4 border-b-2 border-stone-900 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PitchIn weekly board</h1>
            <p className="mt-1 text-lg">Hamilton, Montana · week of {data.weekOf}</p>
          </div>
          <PrintButton />
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold">Open needs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {needs.map((need) => {
              const tasks = tasksForNeed(data, need.id);
              const requester = data.members.find((member) => member.id === need.requesterId);
              const caller = need.publishConsent && requester ? requester : coordinator;
              return (
                <article key={need.id} className="print-card rounded-lg border border-stone-300 p-4">
                  <h3 className="text-lg font-semibold">{need.title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{need.street} · {need.urgency}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    {tasks.map((task) => (
                      <div key={task.id} className="border-t border-stone-200 pt-2">
                        <div className="font-medium">{task.title}</div>
                        <div>{task.minutes} minutes · quorum {task.quorum} · {task.status}</div>
                        <div>Capabilities: {task.capabilities.length ? task.capabilities.map(label).join(', ') : 'none'} · quals: {task.quals.length ? task.quals.map(label).join(', ') : 'none'}</div>
                        <div>Materiel: {task.materiel.length ? task.materiel.join(', ') : 'none listed'}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-stone-200 pt-2 text-sm font-medium">
                    Call {caller?.name ?? 'the coordinator'}{caller?.phone ? ` · ${caller.phone}` : ''}
                  </p>
                </article>
              );
            })}
          </div>
          {needs.length === 0 ? <p className="text-sm">No public needs are open this week.</p> : null}
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xl font-bold">Needs met this month</h2>
            <p className="text-3xl font-bold">{metThisMonth}</p>
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">Next drill</h2>
            {upcoming ? <p className="text-sm"><strong>{upcoming.task.title}</strong> · {formatWhen(upcoming.task.scheduledFor)}<br />{upcoming.need.title}</p> : <p className="text-sm">No upcoming public task is scheduled.</p>}
          </section>
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">Crew standings</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.crews.map((crew) => {
              const members = data.members.filter((member) => crew.memberIds.includes(member.id));
              const made = members.reduce((sum, member) => sum + showRate(member).made, 0);
              const kept = members.reduce((sum, member) => sum + showRate(member).kept, 0);
              return <div key={crew.id} className="print-card rounded border border-stone-300 p-3"><strong>{crew.name}</strong><div className="text-sm">{members.length} members · {crew.streakWeeks}-week streak · {formatRate(made === 0 ? null : kept / made)} show-rate</div></div>;
            })}
          </div>
        </section>
        <p className="mt-10 border-t border-stone-300 pt-3 text-sm">PitchIn — people helping people</p>
      </div>
    </>
  );
}
