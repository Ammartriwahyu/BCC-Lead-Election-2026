'use client';

import type { ReactNode } from 'react';

import { publicEnv } from '@/config/env';
import { SessionExpiryListener } from '@/features/auth/components/SessionExpiryListener';
import { VoterSessionGate } from '@/features/auth/components/VoterSessionGate';
import { IdleSignOutDialog } from '@/features/booth/components/IdleSignOutDialog';
import { OfflineBanner } from '@/features/booth/components/OfflineBanner';
import { useVoting, VotingProvider } from '@/features/voting/VotingProvider';

function BoothIdle() {
  const { isSubmitting } = useVoting();
  return <IdleSignOutDialog enabled={publicEnv.boothMode && !isSubmitting} />;
}

/** Client providers for the signed-in voter area. Everything here is in memory only. */
export function VoterSessionShell({ children }: { children: ReactNode }) {
  return (
    <VotingProvider>
      <SessionExpiryListener />
      <OfflineBanner />
      <VoterSessionGate>{children}</VoterSessionGate>
      <BoothIdle />
    </VotingProvider>
  );
}
