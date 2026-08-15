'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded border border-stone-400 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 print:hidden"
    >
      Print this board
    </button>
  );
}
