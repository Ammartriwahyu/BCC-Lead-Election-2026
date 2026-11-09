import type { Metadata } from 'next';

import { StatusScreen } from '@/components/layout/StatusScreen';
import { VoterNavbar } from '@/components/layout/VoterNavbar';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ROUTES } from '@/config/constants';
import { content } from '@/content/copy';

export const metadata: Metadata = { title: content.notFound.title };

/** NEW (not in Figma): 404 in the V6 status style with Brace "Woah". See DEVIATIONS. */
export default function NotFound() {
  return (
    <VoterPageShell navbar={<VoterNavbar />} decorations="both">
      <StatusScreen
        pose="woah"
        title={content.notFound.title}
        body={<p>{content.notFound.body}</p>}
        actions={<ButtonLink href={ROUTES.signIn}>{content.notFound.action}</ButtonLink>}
      />
    </VoterPageShell>
  );
}
