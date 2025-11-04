import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default to node environment for backend tests
    environment: 'node',
    // Use jsdom for React component tests
    environmentMatchGlobs: [
      ['tests/components/**', 'jsdom'],
      ['**/*.component.test.{ts,tsx}', 'jsdom'],
    ],
    setupFiles: ['./tests/setup.ts'],
    // Run test files sequentially to avoid database race conditions in integration tests
    fileParallelism: false,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**', // E2E tests run with Playwright, not Vitest
      '**/.{idea,git,cache,output,temp}/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@server': path.resolve(__dirname, './src/server'),
      '@client': path.resolve(__dirname, './src/client'),
    },
  },
});
