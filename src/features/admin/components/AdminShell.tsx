'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { AdminSidebar, type AdminSection } from '@/components/layout/AdminSidebar';
import { AdminTopbar } from '@/components/layout/AdminTopbar';
import { Spinner } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toaster';
import { ROUTES } from '@/config/constants';
import { adminNavCopy } from '@/content/adminCopy';
import { content } from '@/content/copy';
import { SessionExpiryListener } from '@/features/auth/components/SessionExpiryListener';
import { hasErrorCode } from '@/lib/api/errors';

import { adminSectionFor, adminTrailFor } from '../adminRouting';
import { useAdminOverview } from '../useAdminOverview';
import { useAdminSession } from '../useAdminSession';
import { useAdminSignOut } from '../useAdminSignOut';
import { AdminLoadError } from './AdminLoadError';
import { ResultsLockedDialog } from './ResultsLockedDialog';

const PAGE_NAMES: Record<AdminSection, string> = {
  overview: adminNavCopy.overview,
  candidates: adminNavCopy.candidates,
  voters: adminNavCopy.voters,
  results: adminNavCopy.results,
};

function ShellBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useAdminSession();
  const overview = useAdminOverview();
  const { signOut, signingOut } = useAdminSignOut();
  const [lockedOpen, setLockedOpen] = useState(false);

  if (!session.data) {
    // A 401 is handled by SessionExpiryListener (redirect to committee sign-in).
    if (session.isError && !hasErrorCode(session.error, 'UNAUTHORIZED')) {
      return (
        <div className="flex min-h-dvh items-center justify-center p-16">
          <AdminLoadError onRetry={() => void session.refetch()} />
        </div>
      );
    }
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center">
        <Spinner size={48} />
        <span className="sr-only">{content.loading}</span>
      </div>
    );
  }

  const section = adminSectionFor(pathname);
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page lg:flex-row">
      <AdminSidebar
        active={section}
        // Locked until the backend says CLOSED, also while the state is still loading.
        resultsLocked={overview.data?.election.state !== 'CLOSED'}
        onResultsLocked={() => {
          setLockedOpen(true);
        }}
        onSignOut={() => void signOut()}
        signingOut={signingOut}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-32 px-16 pt-24 pb-48 md:px-40 md:pt-40 2xl:pr-100">
        <AdminTopbar
          trail={adminTrailFor(pathname, PAGE_NAMES, {
            add: adminNavCopy.breadcrumbAdd,
            edit: adminNavCopy.breadcrumbEdit,
          })}
          accountName={session.data.username}
        />
        <main className="flex flex-col gap-32">{children}</main>
      </div>
      <ResultsLockedDialog open={lockedOpen} onOpenChange={setLockedOpen} />
    </div>
  );
}

/**
 * Frame of every committee page (A1–A5): sidebar 263, content with the topbar, toasts for
 * conflicts, and the 401 handler that returns to committee sign-in.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionExpiryListener signInRoute={ROUTES.adminSignIn} />
      <ShellBody>{children}</ShellBody>
    </ToastProvider>
  );
}
