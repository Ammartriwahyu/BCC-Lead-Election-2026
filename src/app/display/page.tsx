import type { Metadata } from 'next';

import { displayCopy } from '@/content/displayCopy';
import { DisplayView } from '@/features/display/components/DisplayView';

export const metadata: Metadata = { title: displayCopy.pageTitle };

/** D1–D6 · Public display for the videotron laptop. No sign-in; only the payload on air. */
export default function DisplayPage() {
  return <DisplayView />;
}
