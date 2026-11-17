import type { ReactNode } from 'react';

import { ElectionBadge } from '@/features/election/components/ElectionBadge';
import type { ElectionState } from '@/lib/api/types';

interface AdminPageHeaderProps {
  title: string;
  /** Voting status pill next to the title. */
  state: ElectionState;
  subtitle: string;
  /** Page actions on the right (Open voting now, Close voting, Reopen voting, View results). */
  actions?: ReactNode;
}

/** "Page header" of A1–A5 (42:2283): Heading 3 + status badge, Body 1 line, actions bottom right. */
export function AdminPageHeader({ title, state, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-16">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
          <h1 className="text-heading-3 text-text-primary">{title}</h1>
          <ElectionBadge state={state} />
        </div>
        <p className="text-body-1 text-text-secondary">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-16">{actions}</div> : null}
    </div>
  );
}
