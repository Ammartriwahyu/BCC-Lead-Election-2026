import type { ReactNode } from 'react';

import { Brace, type BracePose } from './Brace';

interface StatusScreenProps {
  pose: BracePose;
  title: string;
  body: ReactNode;
  /** Detail row under the body (e.g. "Submitted Nov 9, 2026 at 10:24 WIB"). */
  detail?: ReactNode;
  /** Buttons. Full width on mobile, inline on desktop. */
  actions?: ReactNode;
  /** Extra line under the actions (e.g. booth auto sign-out countdown). */
  footnote?: ReactNode;
  /** Heading level for the title (h1 on standalone pages). */
  headingLevel?: 1 | 2;
}

/**
 * Status card of V4 / V5 / V5b / V6 (desktop 38:1857: 760 wide, Brace 200 left, Heading 4)
 * and MV4–MV6 (Brace 150 above a full-width card, Heading 5).
 */
export function StatusScreen({
  pose,
  title,
  body,
  detail,
  actions,
  footnote,
  headingLevel = 1,
}: StatusScreenProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-16 py-32 md:px-40 md:py-48">
      <Brace pose={pose} width={150} eager className="animate-pop-in md:hidden" />
      <div
        data-surface="light"
        className="flex w-full animate-rise-in flex-col gap-12 rounded-xl bg-surface-card px-20 py-24 shadow-card md:w-760 md:max-w-full md:flex-row md:items-center md:gap-40 md:py-40 md:pr-48 md:pl-40"
      >
        <Brace
          pose={pose}
          width={200}
          eager
          className="hidden animate-pop-in motion-follow md:block"
        />
        <div className="flex min-w-0 flex-1 motion-stagger flex-col gap-12 md:gap-16">
          <Heading className="text-heading-5 text-text-primary md:text-heading-4">{title}</Heading>
          <div className="text-body-2 text-text-secondary md:text-body-1">{body}</div>
          {detail}
          {actions ? (
            <div className="flex flex-col gap-12 pt-8 *:w-full md:flex-row md:*:w-auto">
              {actions}
            </div>
          ) : null}
          {footnote}
        </div>
      </div>
    </div>
  );
}
