import type { NextConfig } from 'next';

const isMocking = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';
const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, '');

// CSP is set per request in src/proxy.ts (it needs a nonce). Everything else is static.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  // Self-host deploys build with NEXT_OUTPUT=standalone (pnpm build:standalone).
  // Left off by default so `next start` (e2e, Lighthouse) runs without warnings.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' as const } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    // Real backend: forward same-origin /api/* before the mock route handler is consulted.
    if (isMocking || !apiBaseUrl) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${apiBaseUrl}/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
