import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';

import committeePhoto from '@/assets/admin/committee-photo.webp';
import { Logo } from '@/components/layout/Logo';
import { adminCopy } from '@/content/adminCopy';
import { commonCopy } from '@/content/commonCopy';
import { AdminSignInForm } from '@/features/admin/components/AdminSignInForm';

export const metadata: Metadata = { title: adminCopy.signIn.pageTitle };

/**
 * A0 · Committee sign in (42:2224): photo panel with the event name on the left (766 of 1512),
 * form panel on the right (746). Below 1024 px only the form panel is shown.
 */
export default function AdminSignInPage() {
  return (
    <div className="flex min-h-dvh bg-bg-page">
      <div
        data-surface="dark"
        className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary-800 px-64 pt-48 pb-64 lg:flex"
      >
        <Image
          src={committeePhoto}
          alt=""
          fill
          // Hidden below 1024 px, so no preload; high priority where it is the hero.
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 1024px) 51vw, 1px"
          className="object-cover"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-primary-800/55" />
        <Logo size="sidebar" className="relative" />
        <p className="relative text-heading-3 text-text-on-dark">{commonCopy.brand.electionName}</p>
      </div>
      <main className="flex w-full flex-col justify-center px-16 py-48 md:px-40 lg:w-1/2 lg:shrink-0 lg:py-64 xl:px-64 2xl:w-746 2xl:px-100">
        <div className="mx-auto flex w-full max-w-546 flex-col gap-32">
          <h1 className="text-heading-5 text-text-primary">{adminCopy.signIn.title}</h1>
          <Suspense>
            <AdminSignInForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
