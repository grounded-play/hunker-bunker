import { test, expect } from '@playwright/test';
import { bootToTitleSplash, bootToOperatorMenu } from './helpers.js';

// Phase 13, docs/steam-launch-readiness-master-plan.md: "Boot to menu",
// "Start run", "1280x800 layout screenshot". Runs in a plain browser tab
// (no window.electronAPI, no Steam) — the game's own defensive checks
// (`window.electronAPI?.x`) are exactly what should make that safe, so a
// console-error assertion here doubles as a regression check on that
// contract.

test.describe('boot and main menu', () => {
    test('clicking anywhere boots the WebGL core and reveals the title splash', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToTitleSplash(page);
        await expect(page.locator('#loading-screen')).toBeHidden();

        expect(consoleErrors, `unexpected console errors during boot: ${consoleErrors.join('\n')}`).toEqual([]);

        await page.screenshot({ path: 'playwright-report/screenshots/title-splash-1280x800.png' });
    });

    test('NEW RUN -> INITIALIZE starts a run and the HUD appears', async ({ page }) => {
        await bootToOperatorMenu(page);

        await page.locator('#start-game').click();

        // hud-run-seed is part of the always-present gameplay HUD chrome
        // (index.html) rather than a canvas-drawn element, so it's a
        // reliable DOM signal that the run actually started, past the door-
        // transition/world-build/shader-warmup sequence.
        await expect(page.locator('#hud-run-seed')).toBeVisible({ timeout: 20_000 });

        await page.screenshot({ path: 'playwright-report/screenshots/gameplay-hud-1280x800.png' });
    });
});
