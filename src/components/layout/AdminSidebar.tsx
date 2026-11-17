'use client';

import Link from 'next/link';
import { Dialog as RadixDialog } from 'radix-ui';
import { useState, type ComponentType, type ReactNode } from 'react';

import { CloseIcon } from '@/components/icons/CloseIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { LogoutIcon } from '@/components/icons/LogoutIcon';
import { PeopleIcon } from '@/components/icons/PeopleIcon';
import { PeopleSpeakIcon } from '@/components/icons/PeopleSpeakIcon';
import { PieChartIcon } from '@/components/icons/PieChartIcon';
import { TrophyIcon } from '@/components/icons/TrophyIcon';
import type { IconProps } from '@/components/icons/types';
import { ROUTES } from '@/config/constants';
import { adminNavCopy } from '@/content/adminCopy';
import { cx } from '@/lib/utils/cx';

import { Logo } from './Logo';

export type AdminSection = 'overview' | 'candidates' | 'voters' | 'results';

interface AdminSidebarProps {
  active: AdminSection;
  /** Results shows a lock and opens "Results are locked" instead of navigating. */
  resultsLocked: boolean;
  onResultsLocked: () => void;
  onSignOut: () => void;
  signingOut?: boolean;
}

const itemBase =
  'flex min-h-44 w-full items-center gap-12 rounded-md px-12 py-10 text-left text-body-1-medium text-text-on-dark transition-colors hover:bg-bg-sidebar-active/60';

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  trailing,
  onSelect,
}: {
  href: (typeof ROUTES)['adminOverview' | 'adminCandidates' | 'adminVoters' | 'adminResults'];
  icon: ComponentType<IconProps>;
  label: string;
  active: boolean;
  trailing?: ReactNode;
  onSelect?: (() => void) | undefined;
}) {
  const className = cx(
    itemBase,
    active && 'bg-bg-sidebar-active text-body-1-semibold hover:bg-bg-sidebar-active',
  );
  const inner = (
    <>
      <Icon size={24} />
      <span className="flex-1">{label}</span>
      {trailing}
    </>
  );
  if (onSelect) {
    return (
      <button type="button" className={className} onClick={onSelect}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
      {inner}
    </Link>
  );
}

function SidebarBody({
  active,
  resultsLocked,
  onResultsLocked,
  onSignOut,
  signingOut,
}: AdminSidebarProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-24 p-20">
      <div className="flex flex-col gap-12">
        <div className="px-10 pt-10 pb-24">
          <Logo size="sidebar" />
        </div>
        <nav aria-label={adminNavCopy.label} className="flex flex-col gap-12">
          <NavItem
            href={ROUTES.adminOverview}
            icon={PieChartIcon}
            label={adminNavCopy.overview}
            active={active === 'overview'}
          />
          <NavItem
            href={ROUTES.adminCandidates}
            icon={PeopleSpeakIcon}
            label={adminNavCopy.candidates}
            active={active === 'candidates'}
          />
          <NavItem
            href={ROUTES.adminVoters}
            icon={PeopleIcon}
            label={adminNavCopy.voters}
            active={active === 'voters'}
          />
          <NavItem
            href={ROUTES.adminResults}
            icon={TrophyIcon}
            label={adminNavCopy.results}
            active={active === 'results'}
            onSelect={resultsLocked ? onResultsLocked : undefined}
            trailing={
              resultsLocked ? (
                <>
                  <LockIcon size={20} className="text-slate-200" />
                  <span className="sr-only">, {adminNavCopy.resultsLocked}</span>
                </>
              ) : null
            }
          />
        </nav>
      </div>
      <div className="flex flex-col gap-12">
        <span aria-hidden="true" className="h-1 w-full bg-slate-500" />
        <button
          type="button"
          className={itemBase}
          onClick={onSignOut}
          disabled={signingOut}
          aria-busy={signingOut || undefined}
        >
          <LogoutIcon size={24} />
          <span>{adminNavCopy.signOut}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Figma "Pilketum / Admin sidebar" (37:1089): navy, 263 wide, active item slate/600, Sign out at the bottom.
 * Below 1024 px it becomes a drawer behind a top bar (NEW, see DEVIATIONS).
 */
export function AdminSidebar(props: AdminSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <aside
        data-surface="dark"
        className="sticky top-0 hidden h-dvh w-263 shrink-0 bg-bg-sidebar lg:block"
      >
        <SidebarBody {...props} />
      </aside>

      <div
        data-surface="dark"
        className="sticky top-0 z-40 flex h-64 items-center justify-between bg-bg-sidebar px-16 lg:hidden"
      >
        <Logo size="mobile" />
        <RadixDialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <RadixDialog.Trigger className="flex size-44 items-center justify-center rounded-md text-text-on-dark">
            <span className="sr-only">{adminNavCopy.openMenu}</span>
            <span aria-hidden="true" className="flex w-24 flex-col gap-4">
              <span className="h-2 bg-current" />
              <span className="h-2 bg-current" />
              <span className="h-2 bg-current" />
            </span>
          </RadixDialog.Trigger>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 z-50 bg-primary-900/60" />
            <RadixDialog.Content
              aria-describedby={undefined}
              data-surface="dark"
              className="fixed inset-y-0 left-0 z-50 w-263 bg-bg-sidebar outline-none"
            >
              <RadixDialog.Title className="sr-only">{adminNavCopy.label}</RadixDialog.Title>
              <RadixDialog.Close className="absolute top-12 right-12 flex size-44 items-center justify-center rounded-md text-text-on-dark">
                <span className="sr-only">{adminNavCopy.closeMenu}</span>
                <CloseIcon />
              </RadixDialog.Close>
              <SidebarBody
                {...props}
                onResultsLocked={() => {
                  setDrawerOpen(false);
                  props.onResultsLocked();
                }}
              />
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      </div>
    </>
  );
}
