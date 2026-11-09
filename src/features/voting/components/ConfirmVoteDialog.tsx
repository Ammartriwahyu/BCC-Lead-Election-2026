'use client';

import { PersonIcon } from '@/components/icons/PersonIcon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { content } from '@/content/copy';
import { useOnlineStatus } from '@/features/booth/useOnlineStatus';
import type { Candidate } from '@/lib/api/types';
import { MOBILE_QUERY, useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { formatCandidateNumber } from '@/lib/utils/format';

const copy = content.confirm;

interface ConfirmVoteDialogProps {
  candidate: Candidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: () => void;
}

function Summary({ candidate }: { candidate: Candidate }) {
  return (
    <div className="flex w-full items-center gap-12 rounded-lg bg-bg-subtle p-12 md:gap-16 md:pr-16">
      <span className="flex size-48 shrink-0 items-center justify-center rounded-md bg-surface-card">
        <PersonIcon size={24} className="text-primary-300" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-body-1-semibold break-words text-text-primary">{candidate.name}</p>
        <p className="text-body-2 text-text-secondary">
          {copy.summaryDetails(
            formatCandidateNumber(candidate.number),
            candidate.major,
            candidate.classYear,
          )}
        </p>
      </div>
    </div>
  );
}

function SubmittingStatus({ spinner }: { spinner: number }) {
  return (
    <div className="flex items-center gap-16 py-8 md:gap-24 md:py-0" aria-live="polite">
      <Spinner size={spinner} />
      <div className="flex min-w-0 flex-col md:gap-4">
        <p className="text-heading-6 text-text-primary">{copy.submittingTitle}</p>
        <p className="text-body-2 text-text-secondary">{copy.submittingBody}</p>
      </div>
    </div>
  );
}

/**
 * O · Confirm vote (40:2331) / MO bottom sheet (81:4048), then O · Submitting (40:2379 / 81:4099).
 * While submitting nothing can close it: Esc, outside click and Back are blocked (spec §4.2).
 */
export function ConfirmVoteDialog({
  candidate,
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: ConfirmVoteDialogProps) {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const online = useOnlineStatus();
  const title = copy.title(candidate.name);

  const submitButton = (
    <Button onClick={onSubmit} disabled={!online || submitting} fullWidth={mobile}>
      {copy.submit}
    </Button>
  );
  const cancelButton = (
    <Button
      variant="secondary"
      onClick={() => {
        onOpenChange(false);
      }}
      fullWidth={mobile}
    >
      {copy.cancel}
    </Button>
  );
  const offlineHint = online ? null : (
    <p role="status" className="text-body-2-medium text-text-danger">
      {copy.offlineHint}
    </p>
  );

  if (mobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={submitting ? copy.submittingTitle : title}
        hideTitle={submitting}
        description={submitting ? undefined : copy.bodyMobile}
        dismissible={!submitting}
        actions={
          submitting ? undefined : (
            <>
              {submitButton}
              {cancelButton}
            </>
          )
        }
      >
        {submitting ? (
          <SubmittingStatus spinner={40} />
        ) : (
          <>
            <Summary candidate={candidate} />
            {offlineHint}
          </>
        )}
      </BottomSheet>
    );
  }

  // One Dialog instance for both steps, so focus and the scrim stay put when submitting starts.
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={submitting ? copy.submittingTitle : title}
      dismissible={!submitting}
      bare={submitting}
      {...(submitting
        ? {}
        : {
            description: copy.body,
            actions: (
              <>
                {cancelButton}
                {submitButton}
              </>
            ),
          })}
    >
      {submitting ? (
        <div className="py-32 pr-40 pl-32">
          <SubmittingStatus spinner={48} />
        </div>
      ) : (
        <>
          <Summary candidate={candidate} />
          {offlineHint}
        </>
      )}
    </Dialog>
  );
}
