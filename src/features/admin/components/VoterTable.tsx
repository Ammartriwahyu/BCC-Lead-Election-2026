import { Badge } from '@/components/ui/Badge';
import { adminCopy } from '@/content/adminCopy';
import type { AdminVoter } from '@/lib/api/types';

const copy = adminCopy.voters;

const headCell = 'bg-bg-subtle py-16 pl-20 text-left text-body-2-semibold text-text-primary';
const bodyCell = 'border-b border-neutral-100 py-16 pl-20 align-middle text-body-2-medium';

interface VoterTableProps {
  voters: readonly AdminVoter[];
  /** True while the next page or search is loading and the previous rows are still shown. */
  busy?: boolean;
}

/**
 * Figma "Pilketum / Voter row" (37:1107): header row on bg/subtle, rows with a neutral/100 rule.
 * Privacy: voted / not voted only. No column, tooltip or attribute links a member to a candidate.
 */
export function VoterTable({ voters, busy = false }: VoterTableProps) {
  return (
    <table
      aria-busy={busy || undefined}
      className="w-full table-fixed border-separate border-spacing-0"
    >
      <caption className="sr-only">{copy.tableCaption}</caption>
      <colgroup>
        <col />
        <col />
        <col className="w-140 md:w-200" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={`${headCell} rounded-l-lg`}>
            {copy.columns.name}
          </th>
          <th scope="col" className={headCell}>
            {copy.columns.email}
          </th>
          <th scope="col" className={`${headCell} rounded-r-lg pr-20`}>
            {copy.columns.status}
          </th>
        </tr>
      </thead>
      <tbody>
        {voters.map((voter) => (
          <tr key={voter.id}>
            <td className={`${bodyCell} wrap-anywhere text-text-primary`}>{voter.name}</td>
            <td className={`${bodyCell} wrap-anywhere text-text-secondary`}>
              {voter.email ?? (
                <>
                  <span aria-hidden="true">{copy.noEmail}</span>
                  <span className="sr-only">{copy.noEmailLabel}</span>
                </>
              )}
            </td>
            <td className={`${bodyCell} pr-20`}>
              <Badge tone={voter.status === 'VOTED' ? 'success' : 'neutral'}>
                {copy.status[voter.status]}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
