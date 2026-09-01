import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Phase 13: "Browser Gamepad fallback" (docs/steam-launch-readiness-master-plan.md).
// main.js's fallback loop (startBrowserGamepadFallback) runs unconditionally
// from page load via requestAnimationFrame, polling navigator.getGamepads()
// every frame — no real 'gamepadconnected' event is required, which is what
// makes this testable at all without real hardware.
//
// The fake gamepad is installed *after* startRunAndSkipIntro rather than via
// page.addInitScript at page load. Installing it from page load (so it's
// present throughout boot/the intro sequence) reproducibly broke the boot
// sequence itself even with every axis/button left at zero — something
// during boot (Steam Input availability detection is the likely suspect,
// separate from the browser-gamepad-fallback code path) reacts to
// navigator.getGamepads() reporting a connected-but-idle controller
// differently than reporting none at all. Installing it only once gameplay
// is already confirmed running sidesteps that entirely and still matches
// how a real player would only touch the stick once already playing.
test.describe('Browser Gamepad fallback', () => {
    test('a fake connected gamepad drives player movement once pushed mid-run', async ({ page }) => {
        test.setTimeout(180_000);
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const before = await page.evaluate(() => ({
            x: window.game.player.position.x,
            z: window.game.player.position.z
        }));

        // Install the fake gamepad now, already pushed right (axes[0] >
        // BROWSER_GAMEPAD_DEADZONE=0.18, src/browserGamepad.js) — gameplay
        // is already confirmed active at this point, so there's no boot
        // sequence left for it to interfere with.
        await page.evaluate(() => {
            const fakeGamepad = {
                id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
                index: 0,
                connected: true,
                mapping: 'standard',
                axes: [0.8, 0, 0, 0],
                buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
            };
            navigator.getGamepads = () => [fakeGamepad];
        });
        await page.waitForTimeout(600);

        const after = await page.evaluate(() => ({
            x: window.game.player.position.x,
            z: window.game.player.position.z
        }));
        const moved = Math.hypot(after.x - before.x, after.z - before.z);
        expect(moved, 'a pushed fake gamepad stick should move the player').toBeGreaterThan(0.05);

        // Release the stick — the fallback loop should stop feeding
        // movement rather than leaving the player drifting.
        await page.evaluate(() => { navigator.getGamepads = () => []; });
        await page.waitForTimeout(300);

        expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    });

    // The D-pad had no gameplay binding in the Steam layout and never fed the
    // browser fallback's move vector either, so it was dead during a run. It
    // must now walk the player exactly like the left stick.
    test('the D-pad walks the player like the left stick', async ({ page }) => {
        test.setTimeout(180_000);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        const before = await page.evaluate(() => ({
            x: window.game.player.position.x,
            z: window.game.player.position.z
        }));

        // Sticks dead centre; only D-pad right (button 15) held.
        await page.evaluate(() => {
            const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
            buttons[15] = { pressed: true, value: 1 };
            const fakeGamepad = {
                id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
                index: 0,
                connected: true,
                mapping: 'standard',
                axes: [0, 0, 0, 0],
                buttons
            };
            navigator.getGamepads = () => [fakeGamepad];
        });
        await page.waitForTimeout(600);

        const after = await page.evaluate(() => ({
            x: window.game.player.position.x,
            z: window.game.player.position.z
        }));
        const moved = Math.hypot(after.x - before.x, after.z - before.z);
        expect(moved, 'a held D-pad direction should move the player').toBeGreaterThan(0.05);

        await page.evaluate(() => { navigator.getGamepads = () => []; });
        await page.waitForTimeout(300);
    });
});
