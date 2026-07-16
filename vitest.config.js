import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/e2e/**/*.spec.js are Playwright specs (Phase 13 browser
    // acceptance suite, run via `npm run test:e2e`), not Vitest tests —
    // they import from @playwright/test and drive a real browser, which
    // Vitest's default *.spec.js include pattern would otherwise try to
    // execute directly and fail.
    exclude: ['node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/generator.js'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
