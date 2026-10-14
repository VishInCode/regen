import type { ReactNode } from 'react';
import type { DataStatus, DataSource } from '../lib/api/types';

const statusStyle: Record<DataStatus, string> = {
  observed: 'bg-good/15 text-good',
  estimated: 'bg-warn/15 text-[#b07d1e]',
  scenario: 'bg-terra/15 text-terra',
  planned: 'bg-[#7A5A8C]/15 text-[#7A5A8C]',
  reported: 'bg-navy/15 text-navy',
  fallback: 'bg-canvas-soft text-muted',
};

/** Small pill communicating how trustworthy a value is. */
export function StatusPill({ status }: { status: DataStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle[status]}`}>
      {status}
    </span>
  );
}

/** Subtle source attribution line. */
export function SourceTag({ source, status }: { source: DataSource; status?: DataStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
      Source: {source.name}
      {status && <StatusPill status={status} />}
    </span>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function ViewAll({ label = 'View all', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium text-terra transition hover:gap-2"
    >
      {label} <span aria-hidden>→</span>
    </button>
  );
}

const potentialStyles: Record<string, string> = {
  High: 'bg-good/15 text-good',
  Moderate: 'bg-warn/15 text-[#b07d1e]',
  Emerging: 'bg-terra/15 text-terra',
  Low: 'bg-bad/15 text-bad',
};

export function PotentialBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${potentialStyles[level] ?? 'bg-canvas-soft text-muted'}`}
    >
      {level} Potential
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-canvas-soft px-2 py-1 text-xs text-muted">
      {children}
    </span>
  );
}

export function Meter({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 75 ? 'bg-good' : pct >= 55 ? 'bg-warn' : 'bg-terra';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-soft">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ArrowButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra text-white transition hover:bg-terra-soft"
      aria-label="Open"
    >
      <span aria-hidden>→</span>
    </button>
  );
}
