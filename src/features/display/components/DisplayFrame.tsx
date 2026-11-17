import type { ReactNode } from 'react';

import { Brace, type BracePose } from '@/components/layout/Brace';
import { Decoration } from '@/components/layout/Decoration';
import { Logo } from '@/components/layout/Logo';
import { content } from '@/content/copy';
import { cx } from '@/lib/utils/cx';

/** Figma D1–D6 use the top-right decoration at 140×70 tiles (1.25 × the 112×56 grid). */
const DECORATION_SCALE = 1.25;

export interface BracePlacement {
  pose: BracePose;
  width: number;
  /** Position on the 1920×1080 stage, as in Figma. */
  className: string;
}

interface DisplayFrameProps {
  children?: ReactNode;
  brace?: BracePlacement;
  /** between: top bar, content, footer spread over the height (D1, D2, D4–D6). stack: 32 px gaps (D3). */
  layout?: 'between' | 'stack';
  className?: string;
}

/** "Top bar" of every D frame (44:3017): logo 146, slate/400 divider, event name in Heading 6. */
function TopBar() {
  return (
    <div className="flex items-center gap-20">
      <Logo size="display" />
      <span aria-hidden="true" className="h-40 w-1 bg-slate-400" />
      <p className="text-heading-6 text-text-on-dark">{content.brand.electionName}</p>
    </div>
  );
}

/** Shared 1920×1080 navy frame of D1–D6: padding 100 / 64, decoration top right, Brace sticker. */
export function DisplayFrame({
  children,
  brace,
  layout = 'between',
  className,
}: DisplayFrameProps) {
  return (
    <div
      data-surface="dark"
      className={cx(
        'relative flex h-1080 w-1920 flex-col overflow-hidden bg-bg-navy px-100 py-64',
        layout === 'between' ? 'justify-between' : 'gap-32',
        className,
      )}
    >
      <Decoration
        corner="top-right"
        scale={DECORATION_SCALE}
        className="absolute -top-70 left-1500"
      />
      <TopBar />
      {children}
      {brace ? (
        <Brace
          pose={brace.pose}
          width={brace.width}
          eager
          className={cx('absolute', brace.className)}
        />
      ) : null}
    </div>
  );
}
