'use client';

import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toaster';
import { adminCopy } from '@/content/adminCopy';
import { exportResults } from '@/lib/api/endpoints';
import { hasErrorCode } from '@/lib/api/errors';

const copy = adminCopy.results;

/** Saves a downloaded file under the name the backend gave it. */
function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * NEW (backend GET /admin/results/export, no Figma frame): Excel file with Summary, Results and
 * Voters. Only on Results, which only exists while voting is closed.
 */
export function ExportResultsButton() {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: exportResults,
    onSuccess: ({ blob, fileName }) => {
      saveFile(blob, fileName);
    },
    onError: (error) => {
      if (hasErrorCode(error, 'UNAUTHORIZED')) return;
      toast({ title: copy.exportFailed, tone: 'danger' });
    },
  });
  return (
    <Button
      variant="secondary"
      loading={mutation.isPending}
      onClick={() => {
        if (!mutation.isPending) mutation.mutate();
      }}
    >
      {mutation.isPending ? copy.exporting : copy.export}
    </Button>
  );
}
