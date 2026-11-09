import type { ReactNode } from 'react';

import { cx } from '@/lib/utils/cx';

import { Decoration } from './Decoration';
import { VoterFooter } from './VoterFooter';

interface VoterPageShellProps {
  navbar: ReactNode;
  children: ReactNode;
  /** Corner patterns on navy screens (V0, V4–V6). Shown from 1024 px; always behind content. */
  decorations?: 'none' | 'top-right' | 'both';
  /** Main background: navy screens (sign in, status) or white (candidates). */
  tone?: 'navy' | 'page';
  mainClassName?: string;
}

/** Navy voter page frame: navbar, main area, footer (Figma V0 / V4–V6 / MV frames). */
export function VoterPageShell({
  navbar,
  children,
  decorations = 'none',
  tone = 'navy',
  mainClassName,
}: VoterPageShellProps) {
  return (
    <div className={cx('flex min-h-dvh flex-col', tone === 'navy' ? 'bg-bg-navy' : 'bg-bg-page')}>
      {navbar}
      <main
        id="main"
        data-surface={tone === 'navy' ? 'dark' : undefined}
        className={cx('relative isolate flex flex-1 flex-col overflow-x-clip', mainClassName)}
      >
        {decorations !== 'none' ? (
          <Decoration
            corner="top-right"
            className="absolute top-0 -right-112 -z-10 hidden lg:grid"
          />
        ) : null}
        {decorations === 'both' ? (
          <Decoration
            corner="bottom-left"
            className="absolute bottom-0 -left-112 -z-10 hidden lg:grid"
          />
        ) : null}
        {children}
      </main>
      <VoterFooter />
    </div>
  );
}
