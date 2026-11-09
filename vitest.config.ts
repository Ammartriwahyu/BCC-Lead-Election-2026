import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^.+\.(png|jpe?g|webp|avif)$/,
        replacement: fileURLToPath(new URL('./src/test/imageStub.ts', import.meta.url)),
      },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: { NEXT_PUBLIC_API_MOCKING: 'enabled' },
    coverage: {
      provider: 'v8',
      include: ['src/features/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/index.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
