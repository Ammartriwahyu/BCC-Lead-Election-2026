import { cx } from '@/lib/utils/cx';

interface StatCardProps {
  label: string;
  value: string;
  note?: string;
  className?: string;
}

/** Figma "Pilketum / Stat card" (36:2899). */
export function StatCard({ label, value, note, className }: StatCardProps) {
  return (
    <div
      className={cx(
        'flex flex-col gap-8 rounded-xl border border-border-card bg-surface-card p-20 shadow-card',
        className,
      )}
    >
      <p className="text-body-2-medium text-text-secondary">{label}</p>
      <p className="text-heading-3 text-text-primary tabular-nums">{value}</p>
      {note ? <p className="text-caption text-text-secondary">{note}</p> : null}
    </div>
  );
}
