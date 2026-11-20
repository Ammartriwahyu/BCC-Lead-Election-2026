import type { Metadata } from 'next';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterNavbar } from '@/components/layout/VoterNavbar';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/config/constants';
import { commonCopy } from '@/content/commonCopy';

export const metadata: Metadata = { title: commonCopy.notFound.title };

/** NEW (not in Figma): 404 in the V6 status style with Brace "Woah". See DEVIATIONS. */
export default function NotFound() {
  return (
    <VoterPageShell navbar={<VoterNavbar />} decorations="both">
      <StatusScreen
        pose="woah"
        title={commonCopy.notFound.title}
        body={<p>{commonCopy.notFound.body}</p>}
        actions={<ButtonLink href={ROUTES.signIn}>{commonCopy.notFound.action}</ButtonLink>}
      />
    </VoterPageShell>
  );
}
