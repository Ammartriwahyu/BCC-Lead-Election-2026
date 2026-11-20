import type { ReactNode } from 'react';

/**
 * Remounts on every committee page change (Next.js template), so each page rises in gently while
 * the sidebar and topbar stay still (DEVIATIONS #84). Keeps the 32 px gap of AdminShell's <main>.
 */
export default function AdminPanelTemplate({ children }: { children: ReactNode }) {
  return <div className="flex animate-rise-in flex-col gap-32">{children}</div>;
}
