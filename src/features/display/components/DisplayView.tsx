'use client';

import type { ReactNode } from 'react';

import { content } from '@/content/copy';
import { displayCopy } from '@/content/displayCopy';
import type { DisplayPayload } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';

import { useFullscreenKey, useIdleCursor, useStageScale, useWakeLock } from '../stage';
import { useDisplayFeed } from '../useDisplayFeed';
import { useScreenTransition } from '../useScreenTransition';
import { DisplayFrame } from './DisplayFrame';
import { DisplayScreen } from './DisplayScreen';

/** NEW: small "Reconnecting…" note after 30 s without a connection, left of the decoration. */
function ReconnectingNote() {
  return (
    <p
      role="status"
      data-testid="display-reconnecting"
      className="absolute top-82 right-460 flex items-center gap-8 text-body-2-semibold text-text-on-dark-muted"
    >
      <span aria-hidden="true" className="size-12 animate-pulse rounded-full bg-orange-300" />
      {displayCopy.reconnecting}
    </p>
  );
}

/** Current screen plus, for 400 ms after a change, the previous one fading out on top of it. */
function Screens({ payload }: { payload: DisplayPayload }) {
  const { current, leaving } = useScreenTransition(payload);
  return (
    <>
      <div
        key={current.screen}
        data-screen={current.screen}
        className="absolute inset-0 animate-screen-in"
      >
        <DisplayScreen payload={current} />
      </div>
      {leaving ? (
        <div
          key={`leaving-${leaving.screen}`}
          aria-hidden="true"
          inert
          className="absolute inset-0 animate-screen-out"
        >
          <DisplayScreen payload={leaving} />
        </div>
      ) : null}
    </>
  );
}

/** 1920×1080 stage scaled to fit the window, centred, letterboxed in navy. */
function Stage({ children, cursorHidden }: { children: ReactNode; cursorHidden: boolean }) {
  const scale = useStageScale();
  return (
    <main
      className={cx(
        'fixed inset-0 flex items-center justify-center overflow-hidden bg-bg-navy',
        cursorHidden && 'cursor-none',
      )}
    >
      <div
        data-testid="display-stage"
        className={cx('relative h-1080 w-1920 shrink-0', scale === null && 'invisible')}
        style={{ transform: `scale(${scale ?? 1})` }}
      >
        {children}
      </div>
    </main>
  );
}

/**
 * Public videotron page (/display). No sign-in, no buttons: it shows the payload the committee
 * put on air and follows changes live. F toggles fullscreen; the cursor hides when idle.
 */
export function DisplayView() {
  const { payload, disconnected } = useDisplayFeed();
  const cursorHidden = useIdleCursor();
  useFullscreenKey();
  useWakeLock();

  return (
    <Stage cursorHidden={cursorHidden}>
      {payload ? (
        <Screens payload={payload} />
      ) : (
        // NEW: before the first payload, the empty navy frame with the top bar.
        <div role="status" className="absolute inset-0">
          <DisplayFrame />
          <span className="sr-only">{content.loading}</span>
        </div>
      )}
      {disconnected ? <ReconnectingNote /> : null}
    </Stage>
  );
}
