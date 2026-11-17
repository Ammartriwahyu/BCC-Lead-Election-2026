import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { adminCopy } from '@/content/adminCopy';

/** NEW (not in Figma): a panel query failed after its retries. Same pattern as the candidate list. */
export function AdminLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-16">
      <Alert tone="danger" role="alert">
        {adminCopy.loadError}
      </Alert>
      <Button variant="secondary" onClick={onRetry}>
        {adminCopy.retry}
      </Button>
    </div>
  );
}
