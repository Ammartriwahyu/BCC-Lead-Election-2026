interface Total {
  value: string;
  label: string;
}

/** "Totals" row of D3 / D5 (44:3211): Heading 3 numbers with Heading 6 labels, 64 apart. */
export function DisplayTotals({ totals }: { totals: Total[] }) {
  return (
    <dl className="flex gap-64">
      {totals.map((total) => (
        <div key={total.label} className="flex flex-row-reverse items-baseline gap-12">
          <dt className="text-heading-6 text-primary-200">{total.label}</dt>
          <dd className="text-heading-3 text-text-on-dark tabular-nums">{total.value}</dd>
        </div>
      ))}
    </dl>
  );
}
