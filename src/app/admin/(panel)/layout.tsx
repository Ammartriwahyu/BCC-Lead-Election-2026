import type { ReactNode } from 'react';

import { AdminShell } from '@/features/admin/components/AdminShell';

/** Signed-in committee pages: overview, voter list, results. */
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
