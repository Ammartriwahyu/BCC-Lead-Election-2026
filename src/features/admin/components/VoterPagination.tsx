import { Button } from '@/components/ui/Button';
import { adminCopy } from '@/content/adminCopy';
import { formatNumber } from '@/lib/utils/format';

const copy = adminCopy.voters;

interface VoterPaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

/**
 * "Pagination" of A5 (43:2726, last page 43:2821). At either end the button keeps its place and
 * focus but is marked disabled (aria-disabled), so keyboard users are not thrown back to the top.
 */
export function VoterPagination({ page, pageCount, onPageChange }: VoterPaginationProps) {
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;
  const current = formatNumber(page);
  const total = formatNumber(pageCount);

  return (
    <nav aria-label={copy.paginationLabel} className="flex items-center justify-end gap-12">
      <Button
        variant="secondary"
        aria-disabled={!hasPrevious}
        className={hasPrevious ? '' : 'pointer-events-none'}
        onClick={() => {
          if (hasPrevious) onPageChange(page - 1);
        }}
      >
        {copy.previous}
      </Button>
      <p className="text-body-2-medium text-text-primary tabular-nums">
        <span aria-hidden="true">{copy.page(current, total)}</span>
        <span className="sr-only">{copy.pageSr(current, total)}</span>
      </p>
      <Button
        variant="secondary"
        aria-disabled={!hasNext}
        className={hasNext ? '' : 'pointer-events-none'}
        onClick={() => {
          if (hasNext) onPageChange(page + 1);
        }}
      >
        {copy.next}
      </Button>
    </nav>
  );
}
