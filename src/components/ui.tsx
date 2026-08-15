import type { ReactNode } from 'react';

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4 border-b border-stone-200 pb-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

const toneStyles: Record<string, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  good: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-900',
  alert: 'bg-rose-100 text-rose-800',
};

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'alert';
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${toneStyles[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-stone-500">{hint}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">{children}</p>;
}
