import { content } from '@/content/copy';

import { Logo } from './Logo';

interface VoterNavbarProps {
  /** Signed-in voter's name. Omit on signed-out pages. */
  voterName?: string | undefined;
  /** Sign-out control (a client button) rendered on the right when signed in. */
  signOutSlot?: React.ReactNode;
}

/**
 * Figma "Pilketum / Voter navbar" (36:2921, 1512×88) and "… mobile" (78:3221, 390×64).
 * Sticky at every width so the brand and Sign out stay in reach while the page scrolls
 * (desktop sticky is NEW, DEVIATIONS #85). `data-sticky-navbar` gives the page a matching
 * scroll padding, so keyboard focus never lands under it.
 */
export function VoterNavbar({ voterName, signOutSlot }: VoterNavbarProps) {
  const signedIn = Boolean(signOutSlot);
  return (
    <header
      data-surface="dark"
      data-sticky-navbar=""
      className="sticky top-0 z-40 flex h-64 items-center justify-between bg-bg-navy page-gutter py-8 md:h-88 md:py-20"
    >
      <div className="flex items-center gap-12 md:gap-16">
        <Logo size="mobile" className="md:hidden" />
        <Logo size="navbar" className="hidden md:block" />
        <span
          aria-hidden="true"
          className={
            signedIn ? 'hidden h-32 w-1 bg-slate-400 md:block' : 'h-24 w-1 bg-slate-400 md:h-32'
          }
        />
        <p
          className={
            signedIn
              ? 'hidden text-body-1-medium text-text-on-dark md:block'
              : 'text-body-2-medium text-text-on-dark md:text-body-1-medium'
          }
        >
          {content.brand.electionName}
        </p>
      </div>
      {signedIn ? (
        <div className="flex items-center gap-20">
          {voterName ? (
            <div className="hidden flex-col items-end md:flex">
              <p className="text-caption text-text-on-dark-muted">{content.voterNav.signedInAs}</p>
              <p className="text-body-2-semibold text-text-on-dark">{voterName}</p>
            </div>
          ) : null}
          {signOutSlot}
        </div>
      ) : null}
    </header>
  );
}
