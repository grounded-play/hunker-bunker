import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/e2e/**/*.spec.js are Playwright specs (Phase 13 browser
    // acceptance suite, run via `npm run test:e2e`), not Vitest tests —
    // they import from @playwright/test and drive a real browser, which
    // Vitest's default *.spec.js include pattern would otherwise try to
    // execute directly and fail.
    exclude: ['node_modules/**', 'tests/e2e/**'],
    // steam-build's windows-latest packaging job has twice hit vitest's
    // stock 5000ms/10000ms defaults on the SQLite-backed server/steam*.test.js
    // suites (steamLeaderboards.test.js's initDb() beforeAll hook, and a
    // steamInventory.test.js request) -- ubuntu-latest has never failed the
    // same suites, and it's the same commits passing/failing inconsistently,
    // not a logic regression. Windows CI runners are well-documented as
    // slower/more variable for disk I/O than Linux; this raises the ceiling
    // rather than changing what's being waited on.
    testTimeout: 15000,
    hookTimeout: 20000,
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
