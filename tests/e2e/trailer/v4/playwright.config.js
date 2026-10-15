import { devices } from '@playwright/test';

// Trailer v4 capture: real GPU (Vulkan ANGLE), virtual-time frame stepping
// (vclock.js), no-HMR server. Footage generators, not tests: never part of
// npm run test:e2e. `npm run trailer:capture:v4 [-- --grep <shot>]`.
const port = Number(process.env.TRAILER_PORT ?? 5241);
// The specs here skip unless this flag is set, so `npm run test:e2e` (root
// config, testDir tests/e2e) never starts an hour-long capture.
process.env.HB_TRAILER_V4 = '1';
// 1.35 is the game's own render cap at this stage size (src/renderScale.js:
// 5 MP framebuffer budget), so the canvas renders natively and the HUD
// matches it; frames come out ~2333x1312 and are downsampled to 1080p.
const dsf = Number(process.env.TRAILER_DSF ?? 1.35);
const gpuArgs = ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan'];

export default {
    testDir: '.',
    testMatch: /.*\.spec\.js$/,
    timeout: 3_600_000,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    outputDir: '../../../../trailer/raw/v4/test-results',
    use: {
        baseURL: `http://localhost:${port}`,
        channel: 'chrome',
        headless: true,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: dsf,
        launchOptions: { args: gpuArgs }
    },
    projects: [
        { name: 'gpu', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dsf, launchOptions: { args: gpuArgs } } }
    ],
    webServer: {
        command: `npx vite --config tests/e2e/trailer/v4/vite.capture.config.mjs`,
        cwd: '../../../..',
        url: `http://localhost:${port}`,
        reuseExistingServer: true,
        timeout: 60_000
    }
};
