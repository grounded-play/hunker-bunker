import { defineConfig, devices } from '@playwright/test';

// Trailer footage capture — NOT part of the smoke-test gate (npm run
// test:e2e). Each spec here is a footage generator, not a correctness
// check: it boots the game, forces a specific beat on screen, and lets
// Playwright's video recorder run for a fixed window. See
// docs/superpowers/specs/2026-08-07-steam-trailer-capture-and-assembly-design.md.
export default defineConfig({
    testDir: '.',
    timeout: 120_000,
    expect: { timeout: 5_000 },
    fullyParallel: false,
    // Each capture is a real-time, video-recorded 3D render + input replay --
    // running multiple in parallel starves CPU/GPU across workers and the
    // page becomes unresponsive enough that even page.mouse.move times out
    // (observed: combat/boss specs timing out on mouse.move itself when run
    // 3-wide). One worker at a time keeps each take's real-time pacing sane.
    workers: 1,
    retries: 0,
    reporter: [['list']],
    outputDir: '../../../trailer/raw/test-results',
    use: {
        baseURL: 'http://localhost:5173',
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        video: {
            mode: 'on',
            size: { width: 1920, height: 1080 }
        }
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }
    ],
    webServer: {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 30_000
    }
});
