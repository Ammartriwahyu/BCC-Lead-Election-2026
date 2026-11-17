import { adminNavCopy } from '@/content/adminCopy';

interface AdminTopbarProps {
  /** Pages after "Election /", the last one is the current page ("Candidates", "Add"). */
  trail: readonly string[];
  accountName: string;
}

/** "Election Committee" -> "EC" */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Figma "Pilketum / Admin topbar" (37:914): breadcrumb left, committee account right. */
export function AdminTopbar({ trail, accountName }: AdminTopbarProps) {
  return (
    <div className="flex w-full items-center justify-between gap-16">
      <nav aria-label={adminNavCopy.breadcrumbLabel}>
        <ol className="flex items-center gap-4 text-body-2-medium text-text-secondary">
          <li>{adminNavCopy.breadcrumbRoot}</li>
          {trail.map((item, index) => (
            <li key={item} className="flex items-center gap-4">
              <span aria-hidden="true">/</span>
              <span aria-current={index === trail.length - 1 ? 'page' : undefined}>{item}</span>
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex items-center gap-12">
        <p className="text-body-2-medium text-text-primary">{accountName}</p>
        <span
          aria-hidden="true"
          className="flex size-44 items-center justify-center rounded-full bg-slate-700 text-body-2-semibold text-text-on-dark"
        >
          {initialsOf(accountName)}
        </span>
      </div>
    </div>
  );
}
