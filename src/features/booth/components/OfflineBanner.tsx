'use client';

import { DangerIcon } from '@/components/icons/DangerIcon';
import { content } from '@/content/copy';

import { useOnlineStatus } from '../useOnlineStatus';

/**
 * NEW (not in Figma): pinned under the navbar while the device is offline.
 * Uses the warning status colours. The live region announces it once.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <div role="status" aria-live="polite" className="contents">
      {online ? null : (
        <div className="fixed inset-x-0 top-64 z-30 flex items-center justify-center gap-12 bg-status-warning-bg px-16 py-12 text-body-2-medium text-orange-700 shadow-dropdown md:top-88">
          <DangerIcon size={20} className="shrink-0" />
          <p>{content.offline.banner}</p>
        </div>
      )}
    </div>
  );
}
