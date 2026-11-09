import type { ReactNode } from 'react';

import { VoterSessionShell } from './VoterSessionShell';

/** Signed-in voter pages: candidates, vision & mission, vote results, closed. */
export default function VoterSessionLayout({ children }: { children: ReactNode }) {
  return <VoterSessionShell>{children}</VoterSessionShell>;
}
