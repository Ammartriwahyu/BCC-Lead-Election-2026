import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Brace } from '@/components/layout/Brace';
import { VoterNavbar } from '@/components/layout/VoterNavbar';
import { VoterPageShell } from '@/components/layout/VoterPageShell';
import { signInCopy } from '@/content/signInCopy';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { OfflineBanner } from '@/features/booth/components/OfflineBanner';
import { ElectionStatusStrip } from '@/features/election/components/ElectionStatusStrip';

export const metadata: Metadata = { title: signInCopy.cardTitle };

const copy = signInCopy;

/**
 * V0a–d (desktop 1512) / MV0a–d (390): intro with the live voting status strip and the sign-in card.
 * Side by side from 1024 px, stacked below.
 */
export default function SignInPage() {
  return (
    <VoterPageShell navbar={<VoterNavbar />} decorations="top-right">
      <OfflineBanner />
      <div className="flex flex-1 motion-stagger flex-col lg:flex-row lg:items-center lg:gap-80 lg:page-gutter lg:py-64">
        <div className="flex flex-col gap-12 px-16 py-24 md:px-40 md:py-48 lg:flex-1 lg:gap-24 lg:p-0">
          <h1 className="text-heading-4 text-text-on-dark md:text-heading-2 lg:text-heading-1">
            {copy.title}
          </h1>
          <p className="text-body-2 text-text-on-dark-muted md:text-body-1">{copy.intro}</p>
          <ElectionStatusStrip />
        </div>
        <div className="px-16 pt-64 pb-24 md:px-40 md:pb-48 lg:p-0">
          <div
            data-surface="light"
            className="relative mx-auto w-full max-w-520 rounded-xl bg-surface-card px-20 py-24 shadow-card md:p-32 lg:w-520"
          >
            <Brace
              pose="hello"
              width={84}
              eager
              className="absolute -top-74 right-4 animate-pop-in motion-follow md:hidden"
            />
            <Brace
              pose="hello"
              width={150}
              eager
              className="absolute -top-150 -right-24 hidden animate-pop-in motion-follow md:block"
            />
            <Suspense>
              <SignInForm />
            </Suspense>
          </div>
        </div>
      </div>
    </VoterPageShell>
  );
}
