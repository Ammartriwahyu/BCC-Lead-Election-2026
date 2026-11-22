'use client';

import dynamic from 'next/dynamic';

/** The Adjust photo dialog loads only when the committee opens it (JS budget of the form). */
export const LazyPhotoAdjustDialog = dynamic(
  () => import('./PhotoAdjustDialog').then((m) => m.PhotoAdjustDialog),
  { ssr: false },
);
