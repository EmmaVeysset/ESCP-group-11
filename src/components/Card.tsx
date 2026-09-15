import type { ReactNode } from 'react';

export function Card({ title, subtitle, children, className = '' }: { title?: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      {title && <h2 className="text-base font-semibold text-text-primary">{title}</h2>}
      {subtitle && <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>}
      <div className={title || subtitle ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'bad' | 'accent';
}) {
  const toneClass =
    tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-warning' : tone === 'accent' ? 'text-accent' : 'text-primary';
  return (
    <div className="rounded-xl bg-page px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-secondary">{hint}</p>}
    </div>
  );
}
