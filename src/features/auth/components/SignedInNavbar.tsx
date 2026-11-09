'use client';

import { VoterNavbar } from '@/components/layout/VoterNavbar';

import { useVoterSession } from '../useVoterSession';
import { SignOutButton } from './SignOutButton';

/** Voter navbar, signed-in variant: "Signed in as" + name (desktop) and Sign out. */
export function SignedInNavbar() {
  const { data } = useVoterSession();
  return <VoterNavbar voterName={data?.name} signOutSlot={<SignOutButton />} />;
}
