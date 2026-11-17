import type { Metadata } from 'next';

import { adminCopy } from '@/content/adminCopy';
import { OverviewView } from '@/features/admin/components/OverviewView';

export const metadata: Metadata = { title: adminCopy.overview.title };

/** A1–A3 · Overview, with O · Open / Close / Reopen voting. */
export default function AdminOverviewPage() {
  return <OverviewView />;
}
