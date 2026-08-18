import { defineConfig, devices } from '@playwright/test';

// Steam launch readiness Phase 13 (docs/steam-launch-readiness-master-plan.md):
// browser-level smoke coverage the Vitest suite can't reach (real DOM, real
// boot sequence, real click-driven UI state). Runs against the Vite dev
// server so it needs no Steam/Electron/backend dependency — see each spec's
// own comments for what's stubbed vs real.
export default defineConfig({
    testDir: './tests/e2e',
    // Gameplay specs go through the full run-start sequence
    // (startRunAndSkipIntro in helpers.js: class intro -> cutscene ->
    // Mothership dialogue -> door-transition reveal) before they can do
    // anything — 30s was tight even under normal load and flaked outright
    // under the heavier multi-agent/multi-browser load this dev container
    // sees during this sprint. 60s then proved tight again once
    // startRunAndSkipIntro became an unblock-until-live loop (its 45s
    // worst case is the boot alone, leaving nothing for the actual test
    // body under load) — 120s gives the body real room without masking
    // hangs, since the boot helper still hard-fails at 45s.
    timeout: 120_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: 1,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        baseURL: 'http://localhost:5173',
        // Reuses the machine's real Chrome install (present in this dev
        // container/CI image) instead of downloading Playwright's own
        // browser binaries, which may not have network access.
        channel: 'chrome',
        viewport: { width: 1280, height: 800 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }
    ],
    webServer: {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000
    }
});
