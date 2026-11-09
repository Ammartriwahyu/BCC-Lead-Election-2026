'use client';

import { Button } from '@/components/ui/Button';
import type { ButtonVariant } from '@/components/ui/buttonStyles';
import { content } from '@/content/copy';

import { useVoterSignOut } from '../useVoterSignOut';

/** "Tombol / Sign out" (navbar, on-dark) and "Sign out (page)" (status cards, primary). */
export function SignOutButton({ variant = 'on-dark' }: { variant?: ButtonVariant }) {
  const { signOut, signingOut } = useVoterSignOut();
  return (
    <Button variant={variant} loading={signingOut} onClick={() => void signOut()}>
      {content.voterNav.signOut}
    </Button>
  );
}
