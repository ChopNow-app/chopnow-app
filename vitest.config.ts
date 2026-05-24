import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: [
      '{features,lib,components,app}/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      // v8 (native) — faster than istanbul and matches Node's
      // built-in coverage provider. No instrumentation pass needed.
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // What we care about for the pilot dashboard:
      //   - features/* (the actor surfaces — the most user-impacting code)
      //   - lib/* (shared utilities — auth, api-client, pricing)
      //   - components/* (shared UI primitives)
      // Excluded:
      //   - e2e/* (Playwright specs — own runtime)
      //   - tests/* (test infra itself)
      //   - app/* layouts + pages (mostly thin wiring; covered via the
      //     component tests beneath them)
      //   - *.d.ts, generated types, OpenAPI codegen output
      include: ['features/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        '**/*.d.ts',
        'lib/api/types.ts', // openapi-typescript codegen — not hand-written
        'e2e/**',
        'tests/**',
      ],
      // NO thresholds yet — Phase D3 will ratchet starting at 30% lines
      // once the metric is stable. Shipping without thresholds means
      // the report lands as visibility, not a CI failure trigger. See
      // chopnow-docs/testing/coverage.md for the ratchet plan.
    },
  },
});
