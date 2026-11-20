import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Inter } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

import { commonCopy } from '@/content/commonCopy';

import { Providers } from './providers';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Literal env comparison: the switcher is compiled out of builds without mocking.
const ScenarioSwitcher =
  process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
    ? dynamic(() => import('@/mocks/ui/ScenarioSwitcher').then((m) => m.ScenarioSwitcher))
    : null;

export const metadata: Metadata = {
  title: { default: commonCopy.meta.title, template: `%s · ${commonCopy.meta.title}` },
  description: commonCopy.meta.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  // Render every page per request: the CSP nonce from src/proxy.ts only reaches dynamic pages.
  await connection();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          {children}
          {ScenarioSwitcher ? <ScenarioSwitcher /> : null}
        </Providers>
      </body>
    </html>
  );
}
