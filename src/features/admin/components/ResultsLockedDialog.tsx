'use client';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { adminCopy } from '@/content/adminCopy';

const copy = adminCopy.dialogs.resultsLocked;

interface ResultsLockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** O · Results locked (42:2522): shown instead of the Results page until voting is closed. */
export function ResultsLockedDialog({ open, onOpenChange }: ResultsLockedDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.body}
      actions={
        <Button
          onClick={() => {
            onOpenChange(false);
          }}
        >
          {copy.confirm}
        </Button>
      }
    />
  );
}
