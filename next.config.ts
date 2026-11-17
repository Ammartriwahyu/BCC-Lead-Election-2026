import type { NextConfig } from 'next';

// Hosts allowed for candidate photos (next/image), build time. Comma-separated URL patterns,
// e.g. "https://cdn.example.org/photos/**". Empty: photos must be same-origin paths.
const imageRemotePatterns = (process.env.IMAGE_REMOTE_PATTERNS ?? '')
  .split(',')
  .map((pattern) => pattern.trim())
  .filter(Boolean)
  .map((pattern) => new URL(pattern));

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
  ...(imageRemotePatterns.length > 0 ? { images: { remotePatterns: imageRemotePatterns } } : {}),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
