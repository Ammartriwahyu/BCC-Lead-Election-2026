import { notFound } from 'next/navigation';

import { ToastProvider } from '@/components/ui/Toaster';

import { GalleryClient } from './GalleryClient';

export const metadata = { title: 'Component gallery', robots: { index: false } };

/** Dev-only visual check of components/ui and components/layout against Figma. 404 outside mock builds. */
export default function GalleryPage() {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled') notFound();
  return (
    <ToastProvider>
      <GalleryClient />
    </ToastProvider>
  );
}
