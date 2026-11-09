import { content } from '@/content/copy';

interface AdminTopbarProps {
  /** Current page, shown after "Election /". */
  page: string;
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
export function AdminTopbar({ page, accountName }: AdminTopbarProps) {
  return (
    <div className="flex w-full items-center justify-between gap-16">
      <nav aria-label={content.adminNav.breadcrumbLabel}>
        <ol className="flex items-center gap-4 text-body-2-medium text-text-secondary">
          <li>{content.adminNav.breadcrumbRoot}</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{page}</li>
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
