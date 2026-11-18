'use client';

import { useRef } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ROUTES } from '@/config/constants';
import { adminCopy } from '@/content/adminCopy';
import type { AdminOverview, DisplayScreen, ResultsSummary } from '@/lib/api/types';
import { cx } from '@/lib/utils/cx';
import { DISPLAY_SCREENS } from '@/lib/utils/display-screens';

import { displayRowStatus, displayThumbnail, type DisplayRowStatus } from '../displayControl';
import { useSetDisplayScreen } from '../useSetDisplayScreen';

const copy = adminCopy.display;

interface DisplayControlCardProps {
  overview: AdminOverview;
  /** Candidate totals for the Final results thumbnail. Pass only while voting is CLOSED. */
  results?: ResultsSummary | undefined;
}

interface RowProps {
  screen: DisplayScreen;
  status: DisplayRowStatus;
  thumbnail: string;
  onShow: () => void;
}

function ScreenRow({ screen, status, thumbnail, onShow }: RowProps) {
  const { name, text } = copy.screens[screen];
  const enabled = status.kind !== 'unavailable';
  return (
    <li
      data-testid={`display-row-${screen}`}
      className={cx(
        'flex flex-wrap items-center gap-x-20 gap-y-8 rounded-lg px-12 py-8',
        status.kind === 'on-screen' && 'bg-bg-subtle',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'flex h-64 w-112 shrink-0 items-center justify-center rounded-md px-4 text-center text-body-2-semibold',
          enabled
            ? 'bg-bg-navy text-text-on-dark'
            : 'border border-neutral-100 bg-neutral-50 text-text-secondary',
        )}
      >
        {thumbnail}
      </span>
      <div className="flex min-w-160 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
          <h3
            className={cx(
              'text-body-1-semibold',
              enabled ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            {name}
          </h3>
          {status.kind === 'on-screen' ? <Badge tone="success">{copy.onScreen}</Badge> : null}
        </div>
        <p className="text-body-2 text-text-secondary">{text}</p>
      </div>
      {status.kind === 'on-screen' ? (
        // Plain link: /display is a separate public page, opened in its own tab like the videotron.
        <a
          href={ROUTES.display}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.previewFor(name)}
          className={buttonClassName('secondary')}
        >
          {copy.preview}
        </a>
      ) : null}
      {status.kind === 'available' ? (
        <Button aria-label={copy.showFor(name)} onClick={onShow}>
          {copy.show}
        </Button>
      ) : null}
      {status.kind === 'unavailable' ? (
        <p className="text-body-2-medium text-text-secondary">{status.reason}</p>
      ) : null}
    </li>
  );
}

/**
 * Figma "Pilketum / Display control" (52:3755), on Overview and Results. Six rows; a row can be
 * shown only when the backend allows that screen in the current voting state. Result screens
 * (The winner is…, Final results, Most votes) go on air only through "Show on display".
 */
export function DisplayControlCard({ overview, results }: DisplayControlCardProps) {
  const { election, turnout, display } = overview;
  const mutation = useSetDisplayScreen();
  // One change at a time: the next one needs the version this one returns.
  const inFlight = useRef(false);

  return (
    <section
      aria-labelledby="display-control-title"
      className="flex flex-col gap-16 rounded-xl border border-border-card bg-surface-card p-24"
    >
      <div className="flex flex-col gap-4">
        <h2 id="display-control-title" className="text-heading-6 text-text-primary">
          {copy.title}
        </h2>
        <p className="text-body-2 text-text-secondary">{copy.intro}</p>
      </div>
      <ul className="flex flex-col">
        {DISPLAY_SCREENS.map((screen) => (
          <ScreenRow
            key={screen}
            screen={screen}
            status={displayRowStatus(screen, election.state, display.activeScreen)}
            thumbnail={displayThumbnail(screen, {
              turnout,
              results: election.state === 'CLOSED' ? results : undefined,
            })}
            onShow={() => {
              if (inFlight.current) return;
              inFlight.current = true;
              mutation.mutate(
                { screen },
                {
                  onSettled: () => {
                    inFlight.current = false;
                  },
                },
              );
            }}
          />
        ))}
      </ul>
    </section>
  );
}
