import Link from 'next/link';
import { NewNeedForm } from '@/components/board/NewNeedForm';
import { dbFresh } from '@/lib/store';

export default function NewNeedPage() {
  const members = dbFresh().members.map(({ id, name }) => ({ id, name }));

  return (
    <div className="max-w-2xl">
      <Link href="/" className="text-xs underline">
        ← Back to the Board
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Ask for a hand</h1>
      <p className="mt-1 text-sm text-stone-600">
        Write the ask in plain English. A coordinator will turn it into tasks;
        it will not appear on the Board yet.
      </p>
      <NewNeedForm members={members} />
    </div>
  );
}
