import Link from 'next/link';
import { db } from '@/lib/store';
import { currentMemberId } from '@/lib/session';
import { MemberSwitcher } from './MemberSwitcher';

const links = [
  { href: '/', text: 'Board' },
  { href: '/pitch', text: 'My pitch' },
  { href: '/crews', text: 'Crews' },
  { href: '/readiness', text: 'Readiness' },
  { href: '/coordinator', text: 'Coordinator' },
];

export async function Nav() {
  const data = db();
  const memberId = await currentMemberId();
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          PitchIn
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-stone-600">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-stone-900">
              {l.text}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <MemberSwitcher
            members={data.members.map((m) => ({ id: m.id, name: m.name }))}
            current={memberId}
          />
        </div>
      </div>
    </header>
  );
}
