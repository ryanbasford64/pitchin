import { ALL_QUALS, formatRate, label, showRate } from '@/lib/derive';
import { db } from '@/lib/store';
import type { Capability } from '@/lib/types';
import { Card, Section, Tag } from '@/components/ui';
import { DeclareSurgeForm, StandDownButton, SurgeResponseButtons } from '@/components/readiness/SurgeControls';

const HARD_CAPABILITIES = ['truck', 'trailer', 'generator', 'pump', 'chainsaw', 'ladder', 'snowblower'] satisfies readonly Capability[];

export default function SurgePage() {
  const data = db();
  const active = data.surges.find((surge) => surge.standDownAt === null);
  const past = data.surges.filter((surge) => surge.standDownAt !== null).slice().reverse().slice(0, 5);
  const rows = active
    ? active.rollCall
      .map((rollCall) => {
        const member = data.members.find((item) => item.id === rollCall.memberId);
        if (!member) return null;
        const matchingQuals = member.quals.filter((grant) => active.quals.includes(grant.qual)).map((grant) => grant.qual);
        return { ...rollCall, member, matchingQuals, showRate: showRate(member) };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => (b.showRate.rate ?? -1) - (a.showRate.rate ?? -1))
    : [];
  const confirmed = rows.filter((row) => row.response === 'yes');
  const confirmedQuals = new Set(confirmed.flatMap((row) => row.matchingQuals));
  const missingQuals = active?.quals.filter((qual) => !confirmedQuals.has(qual)) ?? [];
  const equipment = HARD_CAPABILITIES.map((capability) => ({
    capability,
    count: confirmed.filter((row) => row.member.capabilities.includes(capability)).length,
  })).filter((item) => item.count > 0);
  const pending = rows.filter((row) => row.response === 'pending').length;
  const declined = rows.filter((row) => row.response === 'no').length;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Surge readiness</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">A surge is a coordinated call, not a commitment. Quals decide who is asked; standing here is show-rate only.</p>
        <p className="mt-3 text-sm font-medium">Sustainment exists to make surge possible — the woodpile was the drill.</p>
      </div>

      {!active ? (
        <Section title="Declare a surge" hint="Choose the qualifications that the situation actually requires.">
          <DeclareSurgeForm quals={ALL_QUALS} />
        </Section>
      ) : (
        <Section title={active.name} hint={`Declared ${new Date(active.declaredAt).toLocaleString('en-US', { timeZone: 'UTC' })}`}>
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <Card><div className="text-xs uppercase text-stone-500">Confirmed</div><div className="mt-1 text-2xl font-semibold">{confirmed.length}</div></Card>
            <Card><div className="text-xs uppercase text-stone-500">Pending</div><div className="mt-1 text-2xl font-semibold">{pending}</div></Card>
            <Card><div className="text-xs uppercase text-stone-500">No</div><div className="mt-1 text-2xl font-semibold">{declined}</div></Card>
            <Card><div className="text-xs uppercase text-stone-500">Required quals</div><div className="mt-1 text-2xl font-semibold">{active.quals.length}</div></Card>
          </div>
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <Card><h3 className="text-sm font-semibold">Required quals</h3><p className="mt-2 text-sm">{active.quals.map(label).join(', ')}</p></Card>
            <Card><h3 className="text-sm font-semibold">Equipment inbound</h3><p className="mt-2 text-sm">{equipment.length ? equipment.map((item) => `${item.count} ${label(item.capability)}`).join(', ') : 'Nothing confirmed yet.'}</p></Card>
            <Card><h3 className="text-sm font-semibold">Still missing</h3><p className="mt-2 text-sm">{missingQuals.length ? missingQuals.map(label).join(', ') : 'Every required qual has a confirmed holder.'}{pending ? ` · ${pending} pending` : ''}{declined ? ` · ${declined} declined` : ''}</p></Card>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Roll call</h2>
            <StandDownButton surgeId={active.id} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-2 py-2">Neighbor</th><th className="px-2 py-2">Crew</th><th className="px-2 py-2">Show-rate</th><th className="px-2 py-2">Matching quals</th><th className="px-2 py-2">Capabilities</th><th className="px-2 py-2">Response</th></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const crew = data.crews.find((item) => item.id === row.member.crewId);
                  return <tr key={row.memberId} className="border-b border-stone-100"><td className="px-2 py-2 font-medium">{row.member.name}</td><td className="px-2 py-2">{crew?.name ?? '—'}</td><td className="px-2 py-2">{formatRate(row.showRate.rate)}</td><td className="px-2 py-2">{row.matchingQuals.map(label).join(', ')}</td><td className="px-2 py-2">{row.member.capabilities.map(label).join(', ') || 'none'}</td><td className="px-2 py-2"><SurgeResponseButtons surgeId={active.id} memberId={row.memberId} response={row.response} /></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {past.length > 0 ? (
        <Section title="Past surges">
          <div className="space-y-2">
            {past.map((surge) => <div key={surge.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-stone-200 bg-white p-3 text-sm"><span><strong>{surge.name}</strong> · {surge.rollCall.filter((row) => row.response === 'yes').length} confirmed · {new Date(surge.declaredAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span><Tag tone="neutral">stood down</Tag></div>)}
          </div>
        </Section>
      ) : null}
    </>
  );
}
